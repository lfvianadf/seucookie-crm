-- Migration: registrar_producao também repõe qtd_estoque do produto
--
-- Regra simétrica à de baixar_estoque_produto: pedido desconta, produção
-- reabastece. Como o produto pode ter ficado indisponível sozinho ao chegar
-- a 0 (trigger pedido_itens_baixar_estoque), produzir mais volta a marcar
-- disponivel = true — senão o produto ficaria travado indisponível pra
-- sempre até alguém lembrar de destravar manualmente.
--
-- create or replace com a MESMA assinatura da function já existente —
-- substitui o corpo sem precisar recriar trigger nem tocar em outra coisa.

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
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade produzida deve ser maior que zero.';
  end if;

  select rendimento_cookies into v_rendimento from receitas where id = p_receita_id;
  if v_rendimento is null or v_rendimento <= 0 then
    raise exception 'Receita inválida ou sem rendimento definido.';
  end if;

  v_fator := p_quantidade::numeric / v_rendimento;

  update insumos i
  set estoque_atual = i.estoque_atual - (ri.quantidade * v_fator)
  from receita_insumos ri
  where ri.receita_id = p_receita_id and ri.insumo_id = i.id;

  update produtos
  set qtd_estoque = qtd_estoque + p_quantidade,
      disponivel = true
  where id = p_produto_id;

  insert into producoes (receita_id, produto_id, quantidade_produzida, data)
  values (p_receita_id, p_produto_id, p_quantidade, coalesce(p_data, now()))
  returning id into v_producao_id;

  return v_producao_id;
end;
$$;
