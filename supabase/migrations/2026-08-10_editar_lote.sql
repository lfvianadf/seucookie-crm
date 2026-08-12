-- Migration: editar e excluir lote de compra
--
-- Serve pra corrigir lançamento errado (digitou R$ 10 e era R$ 100).
--
-- A parte delicada é a quantidade. Se o lote já foi consumido por alguma
-- produção, reduzir abaixo do que saiu não tem resposta honesta: aqueles
-- gramas já viraram cookie. Em vez de inventar de onde tirar a diferença, a
-- função bloqueia e diz o mínimo permitido.
--
-- `quantidade_restante` é sempre recalculado como (nova quantidade − o que
-- já foi consumido), nunca ajustado por diferença — assim o saldo continua
-- batendo com producao_consumos mesmo depois de várias correções.

create or replace function editar_lote_insumo(
  p_lote_id uuid,
  p_quantidade numeric,   -- na unidade de compra (kg/L/un)
  p_valor_pago numeric,
  p_data timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insumo_id uuid;
  v_unidade text;
  v_fator numeric;
  v_qtd_base numeric;
  v_consumido numeric;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade precisa ser maior que zero.';
  end if;
  if p_valor_pago is null or p_valor_pago < 0 then
    raise exception 'Valor pago não pode ser negativo.';
  end if;

  select l.insumo_id, i.unidade_base
    into v_insumo_id, v_unidade
  from insumo_lotes l
  join insumos i on i.id = l.insumo_id
  where l.id = p_lote_id;

  if v_insumo_id is null then
    raise exception 'Lote não encontrado.';
  end if;

  v_fator := case when v_unidade = 'un' then 1 else 1000 end;
  v_qtd_base := p_quantidade * v_fator;

  select coalesce(sum(quantidade), 0) into v_consumido
  from producao_consumos where lote_id = p_lote_id;

  if v_qtd_base < v_consumido then
    raise exception
      'Esse lote já teve % % usados em produção. A quantidade não pode ficar abaixo disso.',
      round(v_consumido, 2), v_unidade;
  end if;

  update insumo_lotes
  set quantidade = v_qtd_base,
      quantidade_restante = v_qtd_base - v_consumido,
      preco_unitario = p_valor_pago / v_qtd_base,
      data = coalesce(p_data, data)
  where id = p_lote_id;

  perform sincronizar_insumo_por_lotes(v_insumo_id);
end;
$$;

-- Excluir só faz sentido em lote intocado. Se já virou cookie, apagar o lote
-- deixaria producao_consumos apontando pro vazio e o custo daquela fornada
-- perderia a origem.
create or replace function excluir_lote_insumo(p_lote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insumo_id uuid;
  v_consumido numeric;
begin
  select insumo_id into v_insumo_id from insumo_lotes where id = p_lote_id;
  if v_insumo_id is null then
    raise exception 'Lote não encontrado.';
  end if;

  select coalesce(sum(quantidade), 0) into v_consumido
  from producao_consumos where lote_id = p_lote_id;

  if v_consumido > 0 then
    raise exception
      'Esse lote já foi usado em produção e não pode ser excluído. Corrija a quantidade ou o valor.';
  end if;

  delete from insumo_lotes where id = p_lote_id;
  perform sincronizar_insumo_por_lotes(v_insumo_id);
end;
$$;
