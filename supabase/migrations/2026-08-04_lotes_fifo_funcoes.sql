-- Migration: custo de insumo por FIFO (parte 2 de 2 — operações)
-- Depende de 2026-08-04_lotes_fifo.sql. Rodar aquela primeiro.

-- ENTRADA -------------------------------------------------------------------
-- Cria um lote. Recebe a quantidade na unidade de compra (kg/L/un) e o valor
-- total pago; converte para a unidade base e guarda o preço unitário do lote.
create or replace function registrar_entrada_insumo(
  p_insumo_id uuid,
  p_quantidade numeric,
  p_valor_pago numeric,
  p_data timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unidade text;
  v_fator numeric;
  v_qtd_base numeric;
  v_lote_id uuid;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade precisa ser maior que zero.';
  end if;
  if p_valor_pago is null or p_valor_pago < 0 then
    raise exception 'Valor pago não pode ser negativo.';
  end if;

  select unidade_base into v_unidade from insumos where id = p_insumo_id;
  if v_unidade is null then
    raise exception 'Insumo não encontrado.';
  end if;

  -- compra é em kg/L/un; estoque é em g/ml/un
  v_fator := case when v_unidade = 'un' then 1 else 1000 end;
  v_qtd_base := p_quantidade * v_fator;

  insert into insumo_lotes (
    insumo_id, quantidade, quantidade_restante, preco_unitario, data
  )
  values (
    p_insumo_id, v_qtd_base, v_qtd_base,
    p_valor_pago / v_qtd_base, coalesce(p_data, now())
  )
  returning id into v_lote_id;

  perform sincronizar_insumo_por_lotes(p_insumo_id);
  return v_lote_id;
end;
$$;

-- CONSUMO -------------------------------------------------------------------
-- Baixa uma quantidade do insumo pelos lotes mais antigos e registra o que
-- saiu de cada um. Levanta exceção se não houver saldo — o erro aborta a
-- transação inteira, então uma produção nunca fica gravada pela metade.
create or replace function consumir_insumo_fifo(
  p_producao_id uuid,
  p_insumo_id uuid,
  p_quantidade numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restante numeric := p_quantidade;
  v_disponivel numeric;
  v_nome text;
  v_lote record;
  v_usar numeric;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    return;
  end if;

  select coalesce(sum(quantidade_restante), 0) into v_disponivel
  from insumo_lotes where insumo_id = p_insumo_id;

  if v_disponivel < p_quantidade then
    select nome into v_nome from insumos where id = p_insumo_id;
    raise exception
      'Estoque insuficiente de %: precisa de %, tem %.',
      coalesce(v_nome, 'insumo'),
      round(p_quantidade, 2),
      round(v_disponivel, 2);
  end if;

  for v_lote in
    select id, quantidade_restante
    from insumo_lotes
    where insumo_id = p_insumo_id and quantidade_restante > 0
    order by data, created_at
  loop
    exit when v_restante <= 0;

    v_usar := least(v_lote.quantidade_restante, v_restante);

    update insumo_lotes
    set quantidade_restante = quantidade_restante - v_usar
    where id = v_lote.id;

    insert into producao_consumos (producao_id, lote_id, quantidade)
    values (p_producao_id, v_lote.id, v_usar);

    v_restante := v_restante - v_usar;
  end loop;

  perform sincronizar_insumo_por_lotes(p_insumo_id);
end;
$$;

-- PRODUÇÃO ------------------------------------------------------------------
-- Mesma assinatura de antes: substitui o corpo sem quebrar quem chama.
-- A diferença é que o desconto de insumo agora passa pelos lotes, e falta
-- de estoque bloqueia em vez de deixar o saldo negativo.
create or replace function registrar_producao(
  p_receita_id uuid,
  p_produto_id uuid,
  p_quantidade int,
  p_data timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rendimento int;
  v_fator numeric;
  v_producao_id uuid;
  v_item record;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade produzida deve ser maior que zero.';
  end if;

  select rendimento_cookies into v_rendimento from receitas where id = p_receita_id;
  if v_rendimento is null or v_rendimento <= 0 then
    raise exception 'Receita inválida ou sem rendimento definido.';
  end if;

  v_fator := p_quantidade::numeric / v_rendimento;

  -- a produção é inserida antes porque producao_consumos referencia ela;
  -- se faltar insumo, a exceção desfaz este insert junto
  insert into producoes (receita_id, produto_id, quantidade_produzida, data)
  values (p_receita_id, p_produto_id, p_quantidade, coalesce(p_data, now()))
  returning id into v_producao_id;

  for v_item in
    select insumo_id, quantidade from receita_insumos where receita_id = p_receita_id
  loop
    perform consumir_insumo_fifo(
      v_producao_id, v_item.insumo_id, v_item.quantidade * v_fator
    );
  end loop;

  update produtos
  set qtd_estoque = qtd_estoque + p_quantidade,
      disponivel = true
  where id = p_produto_id;

  return v_producao_id;
end;
$$;

-- ESTORNO -------------------------------------------------------------------
-- Devolve aos lotes exatos que foram consumidos (por isso producao_consumos
-- existe): recalcular pela receita devolveria ao lote errado se a receita
-- tiver mudado desde a fornada.
create or replace function reverter_estoque_producao(p_producao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto_id uuid;
  v_quantidade int;
  v_estoque_final int;
  v_consumo record;
begin
  select produto_id, quantidade_produzida
    into v_produto_id, v_quantidade
  from producoes where id = p_producao_id;

  if v_produto_id is null then
    raise exception 'Produção não encontrada.';
  end if;

  for v_consumo in
    select c.lote_id, c.quantidade, l.insumo_id
    from producao_consumos c
    join insumo_lotes l on l.id = c.lote_id
    where c.producao_id = p_producao_id
  loop
    update insumo_lotes
    set quantidade_restante = quantidade_restante + v_consumo.quantidade
    where id = v_consumo.lote_id;

    perform sincronizar_insumo_por_lotes(v_consumo.insumo_id);
  end loop;

  delete from producao_consumos where producao_id = p_producao_id;

  update produtos
  set qtd_estoque = greatest(qtd_estoque - v_quantidade, 0)
  where id = v_produto_id
  returning qtd_estoque into v_estoque_final;

  if v_estoque_final = 0 then
    update produtos set disponivel = false where id = v_produto_id;
  end if;
end;
$$;

-- ZERAGEM -------------------------------------------------------------------
-- Combinado com o Luís: o estoque atual não tem lote de origem conhecido,
-- então recomeça do zero e as compras que ainda existem em casa são
-- relançadas pela tela. Sem isso, o primeiro lote teria custo inventado.
update insumos set estoque_atual = 0, custo_medio_por_unidade = 0, preco_atual = 0;
