-- Migration: custos mensais (financeiro) e OKRs

-- CUSTOS MENSAIS ------------------------------------------------------------
-- Despesas que não passam pelo estoque de insumo: aluguel, energia, taxa de
-- maquininha, anúncio. O custo de matéria-prima NÃO entra aqui — ele já vem
-- dos lotes, e lançar de novo contaria duas vezes.
--
-- `competencia` é sempre o dia 1º do mês. Guardar como date (e não ano+mês
-- separados) deixa ordenar e filtrar por período direto no banco.
--
-- `recorrente`: marcado, o custo se repete nos meses seguintes sem precisar
-- relançar. A tela projeta a repetição a partir da competência de origem, em
-- vez de criar linhas futuras no banco — assim editar o valor de um custo
-- recorrente não exige caçar e corrigir doze cópias.
--
-- `encerrado_em` é o que permite parar a repetição sem apagar o histórico:
-- o custo some dos meses seguintes mas continua nos meses em que existiu.
create table if not exists custos_mensais (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(10, 2) not null check (valor >= 0),
  competencia date not null,
  recorrente boolean not null default false,
  encerrado_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custos_mensais_competencia_idx
  on custos_mensais (competencia);

-- OKRS ----------------------------------------------------------------------
-- Um objetivo por período, com vários resultados-chave.
create table if not exists okrs (
  id uuid primary key default gen_random_uuid(),
  objetivo text not null,
  -- também dia 1º do mês, mesmo critério de custos_mensais
  competencia date not null,
  created_at timestamptz not null default now()
);

create index if not exists okrs_competencia_idx on okrs (competencia);

-- Cada resultado-chave é medido de um jeito:
--   'manual'    — você atualiza o número na mão (ex: "publicar 12 posts")
--   'vendas'    — faturamento do mês, em R$
--   'cookies'   — cookies produzidos no mês
--   'pedidos'   — pedidos do mês
--   'lucro'     — lucro do mês, em R$
-- As automáticas são calculadas na hora a partir dos dados que já existem;
-- guardar o progresso delas viraria um número velho na primeira venda nova.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'okr_metrica') then
    create type okr_metrica as enum (
      'manual', 'vendas', 'cookies', 'pedidos', 'lucro'
    );
  end if;
end
$$;

create table if not exists okr_resultados (
  id uuid primary key default gen_random_uuid(),
  okr_id uuid not null references okrs(id) on delete cascade,
  descricao text not null,
  metrica okr_metrica not null default 'manual',
  alvo numeric(12, 2) not null check (alvo > 0),
  -- só usado quando metrica = 'manual'
  progresso_manual numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists okr_resultados_okr_idx on okr_resultados (okr_id);

-- RLS: tudo aqui é gestão interna, nada visível pro site anônimo
alter table custos_mensais enable row level security;
alter table okrs enable row level security;
alter table okr_resultados enable row level security;

drop policy if exists "custos_mensais_auth" on custos_mensais;
create policy "custos_mensais_auth" on custos_mensais
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "okrs_auth" on okrs;
create policy "okrs_auth" on okrs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "okr_resultados_auth" on okr_resultados;
create policy "okr_resultados_auth" on okr_resultados
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
