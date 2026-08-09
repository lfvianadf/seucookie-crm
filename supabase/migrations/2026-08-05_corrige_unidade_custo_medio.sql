-- Migration corretiva: unidade do custo médio
--
-- Bug: insumo_lotes.preco_unitario é por unidade BASE (por grama, por ml),
-- porque é assim que o consumo FIFO precisa dele — a receita pede "300 g" e
-- multiplica direto. Mas insumos.custo_medio_por_unidade sempre foi por
-- unidade GRANDE (por kg, por L): é o que a tela exibe e é o que
-- calcularCustoReceita() assume, dividindo por 1000 antes de multiplicar.
--
-- A sincronizar_insumo_por_lotes copiava o valor cru de um pro outro, então
-- o custo de qualquer insumo em g/ml ficava 1000x menor (manteiga a
-- R$ 0,04/kg em vez de R$ 40/kg). Insumos em 'un' escaparam porque lá o
-- fator é 1 — foi o que mascarou o erro.
--
-- Correção: converter para a unidade grande ao gravar o cache. O
-- preco_unitario dos lotes continua por unidade base, sem alteração: o FIFO
-- depende disso e está correto.

create or replace function sincronizar_insumo_por_lotes(p_insumo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fator numeric;
begin
  -- g/ml guardam o preço por grama/ml no lote, mas exibem por kg/L
  select case when unidade_base = 'un' then 1 else 1000 end
    into v_fator
  from insumos where id = p_insumo_id;

  if v_fator is null then
    return;
  end if;

  update insumos
  set estoque_atual = coalesce(
        (select sum(quantidade_restante) from insumo_lotes
         where insumo_id = p_insumo_id), 0),
      custo_medio_por_unidade = custo_medio_insumo(p_insumo_id) * v_fator
  where id = p_insumo_id;
end;
$$;

-- reprocessa todo mundo com a fórmula certa
do $$
declare
  v_id uuid;
begin
  for v_id in select id from insumos loop
    perform sincronizar_insumo_por_lotes(v_id);
  end loop;
end
$$;
