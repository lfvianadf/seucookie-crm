-- Migration: custo de insumo por FIFO (parte 1 de 2 — estrutura)
--
-- Problema que resolve: o custo médio era um número sobrescrito a cada
-- compra, então ele "lembrava" de estoque que já tinha sido consumido. Se
-- você comprou 200g a R$ 10 e 700g a R$ 20 e gastou 300g, sobram 600g que
-- são TODOS da segunda compra — o custo tem que ser R$ 20, não uma média
-- que ainda carrega a compra antiga que acabou.
--
-- Solução: cada entrada vira um lote com saldo próprio. O consumo baixa do
-- lote mais antigo primeiro (FIFO). O custo médio deixa de ser guardado e
-- passa a ser calculado sobre os lotes que ainda têm saldo.

-- Cada compra/entrada de insumo. `quantidade_restante` é o que sobrou dela
-- depois dos consumos — é isso que define se o lote ainda conta no custo.
create table if not exists insumo_lotes (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete cascade,
  -- ambos na unidade base do insumo (g/ml/un)
  quantidade numeric not null check (quantidade > 0),
  quantidade_restante numeric not null check (quantidade_restante >= 0),
  -- preço por unidade base, já convertido de kg/L na hora do lançamento
  preco_unitario numeric not null check (preco_unitario >= 0),
  data timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint insumo_lotes_restante_valido
    check (quantidade_restante <= quantidade)
);

-- o consumo FIFO varre por insumo em ordem de data: este índice é o que
-- torna essa varredura barata
create index if not exists insumo_lotes_fifo_idx
  on insumo_lotes (insumo_id, data, created_at);

-- Quanto cada produção tirou de cada lote. Existe para o estorno poder
-- devolver exatamente aos lotes certos — sem isso, cancelar uma fornada
-- antiga devolveria a quantidade ao lote errado e corromperia o custo.
create table if not exists producao_consumos (
  id uuid primary key default gen_random_uuid(),
  producao_id uuid not null references producoes(id) on delete cascade,
  lote_id uuid not null references insumo_lotes(id) on delete restrict,
  quantidade numeric not null check (quantidade > 0)
);

create index if not exists producao_consumos_producao_idx
  on producao_consumos (producao_id);

alter table insumo_lotes enable row level security;
alter table producao_consumos enable row level security;

-- dados de custo interno: site anônimo não lê nada disso
drop policy if exists "insumo_lotes_auth" on insumo_lotes;
create policy "insumo_lotes_auth" on insumo_lotes
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "producao_consumos_auth" on producao_consumos;
create policy "producao_consumos_auth" on producao_consumos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Custo médio ponderado dos lotes que AINDA têm saldo. É a definição do
-- custo agora — `insumos.custo_medio_por_unidade` vira só um cache disso,
-- mantido pela função abaixo pra não reescrever todo o cálculo de receita.
create or replace function custo_medio_insumo(p_insumo_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    sum(quantidade_restante * preco_unitario) / nullif(sum(quantidade_restante), 0),
    0
  )
  from insumo_lotes
  where insumo_id = p_insumo_id and quantidade_restante > 0;
$$;

-- Recalcula estoque e custo do insumo a partir dos lotes. Toda operação que
-- mexe em lote termina chamando isto, então as duas colunas nunca divergem
-- da soma real dos lotes.
create or replace function sincronizar_insumo_por_lotes(p_insumo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update insumos
  set estoque_atual = coalesce(
        (select sum(quantidade_restante) from insumo_lotes
         where insumo_id = p_insumo_id), 0),
      custo_medio_por_unidade = custo_medio_insumo(p_insumo_id)
  where id = p_insumo_id;
end;
$$;
