-- Migration: excluir uma produção desfazendo o efeito dela no estoque
--
-- Espelho exato de registrar_producao (2026-07-13_producao_repoe_estoque.sql):
-- o que aquela função tirou dos insumos, esta devolve; o que ela somou no
-- qtd_estoque do produto, esta subtrai. Precisa ser uma function no banco
-- (e não código na app) pra que os três efeitos aconteçam na mesma
-- transação — estornar pela metade deixaria o estoque mentindo.
--
-- Observação sobre `disponivel`: se o estorno zerar o estoque do produto,
-- marcamos indisponível, mesma regra do trigger de pedido_itens. Se sobrar
-- estoque, não mexemos — pode ter sido marcado indisponível de propósito.

-- Helper interno: só desfaz o efeito no estoque, sem apagar a linha.
-- Separado porque a edição precisa reverter o estoque antigo e aplicar o
-- novo mantendo a mesma produção; a exclusão precisa reverter e apagar.
create or replace function reverter_estoque_producao(p_producao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receita_id uuid;
  v_produto_id uuid;
  v_quantidade int;
  v_rendimento int;
  v_fator numeric;
  v_estoque_final int;
begin
  select receita_id, produto_id, quantidade_produzida
    into v_receita_id, v_produto_id, v_quantidade
  from producoes
  where id = p_producao_id;

  if v_receita_id is null then
    raise exception 'Produção não encontrada.';
  end if;

  select rendimento_cookies into v_rendimento from receitas where id = v_receita_id;
  if v_rendimento is null or v_rendimento <= 0 then
    raise exception 'Receita inválida ou sem rendimento definido.';
  end if;

  v_fator := v_quantidade::numeric / v_rendimento;

  update insumos i
  set estoque_atual = i.estoque_atual + (ri.quantidade * v_fator)
  from receita_insumos ri
  where ri.receita_id = v_receita_id and ri.insumo_id = i.id;

  update produtos
  set qtd_estoque = greatest(qtd_estoque - v_quantidade, 0)
  where id = v_produto_id
  returning qtd_estoque into v_estoque_final;

  if v_estoque_final = 0 then
    update produtos set disponivel = false where id = v_produto_id;
  end if;
end;
$$;

create or replace function estornar_producao(p_producao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform reverter_estoque_producao(p_producao_id);
  delete from producoes where id = p_producao_id;
end;
$$;

-- Edição: reverte o efeito antigo e aplica o novo, na mesma transação.
create or replace function atualizar_producao(
  p_producao_id uuid,
  p_receita_id uuid,
  p_produto_id uuid,
  p_quantidade int,
  p_data timestamptz default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rendimento int;
  v_fator numeric;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade produzida deve ser maior que zero.';
  end if;

  select rendimento_cookies into v_rendimento from receitas where id = p_receita_id;
  if v_rendimento is null or v_rendimento <= 0 then
    raise exception 'Receita inválida ou sem rendimento definido.';
  end if;

  perform reverter_estoque_producao(p_producao_id);

  v_fator := p_quantidade::numeric / v_rendimento;

  update insumos i
  set estoque_atual = i.estoque_atual - (ri.quantidade * v_fator)
  from receita_insumos ri
  where ri.receita_id = p_receita_id and ri.insumo_id = i.id;

  update produtos
  set qtd_estoque = qtd_estoque + p_quantidade,
      disponivel = true
  where id = p_produto_id;

  update producoes
  set receita_id = p_receita_id,
      produto_id = p_produto_id,
      quantidade_produzida = p_quantidade,
      data = coalesce(p_data, data)
  where id = p_producao_id;
end;
$$;
