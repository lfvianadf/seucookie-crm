-- Seu Cookie CRM — schema completo
-- Rodar no SQL Editor do Supabase (projeto: syomsglwyummyclilbzv)
-- Idempotente: pode rodar de novo sem duplicar.

create extension if not exists "pgcrypto";

-- ==========================================================
-- ENUMS
-- ==========================================================

do $$ begin
  create type pedido_status as enum ('novo', 'em_producao', 'pronto', 'saiu_entrega', 'entregue', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pedido_origem as enum ('site', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unidade_base as enum ('g', 'ml', 'un');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nota_fiscal_status as enum ('processando', 'aguardando_validacao', 'confirmada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type entrega_status as enum ('pendente', 'saiu', 'entregue');
exception when duplicate_object then null; end $$;

-- ==========================================================
-- TABELAS — núcleo de cardápio e pedidos
-- ==========================================================

create table if not exists receitas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  rendimento_cookies int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  numero_receita int,
  descricao text,
  preco numeric(10, 2) not null,
  disponivel boolean not null default true,
  capitulo text,
  foto_url text,
  receita_id uuid references receitas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  endereco text,
  created_at timestamptz not null default now()
);

create unique index if not exists clientes_telefone_idx on clientes (telefone);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  status pedido_status not null default 'novo',
  origem pedido_origem not null default 'manual',
  valor_total numeric(10, 2) not null default 0,
  observacoes text,
  data_pedido timestamptz not null default now(),
  data_entrega_prevista timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pedidos_cliente_id_idx on pedidos (cliente_id);
create index if not exists pedidos_status_idx on pedidos (status);

create table if not exists pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade int not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null
);

create index if not exists pedido_itens_pedido_id_idx on pedido_itens (pedido_id);

-- ==========================================================
-- TABELAS — módulo de insumos
-- ==========================================================

create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade_base unidade_base not null,
  estoque_atual numeric(12, 3) not null default 0,
  -- custo médio por kg (se unidade_base = g), por L (se ml), ou por un (se un).
  -- NUNCA por grama/ml crus — normalizado pra escala grande, mais legível.
  custo_medio_por_unidade numeric(12, 6) not null default 0,
  -- preço da última compra validada, na mesma escala (kg/L/un) — não é
  -- média, é o preço mais recente, pra flagar alta de fornecedor.
  preco_atual numeric(12, 6) not null default 0,
  -- quantas compras (notas validadas) já entraram na média — permite
  -- recalcular a média simples (não ponderada por estoque) a cada compra nova.
  numero_compras int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table insumos add column if not exists numero_compras int not null default 0;
alter table insumos add column if not exists preco_atual numeric(12, 6) not null default 0;

create table if not exists insumo_apelidos (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete cascade,
  texto_nota text not null
);

create unique index if not exists insumo_apelidos_texto_nota_idx on insumo_apelidos (texto_nota);

create table if not exists receita_insumos (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete restrict,
  quantidade numeric(12, 3) not null check (quantidade > 0)
);

create index if not exists receita_insumos_receita_id_idx on receita_insumos (receita_id);

create table if not exists notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  foto_url text,
  data_compra date not null,
  valor_total numeric(10, 2) not null,
  status nota_fiscal_status not null default 'processando',
  created_at timestamptz not null default now()
);

create table if not exists nota_itens (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references notas_fiscais(id) on delete cascade,
  texto_original text not null,
  insumo_id uuid references insumos(id) on delete set null,
  quantidade numeric(12, 3) not null,
  valor numeric(10, 2) not null,
  validado boolean not null default false
);

create index if not exists nota_itens_nota_id_idx on nota_itens (nota_id);

create table if not exists producoes (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete restrict,
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade_produzida int not null check (quantidade_produzida > 0),
  data timestamptz not null default now()
);

-- ==========================================================
-- TABELAS — entregas
-- ==========================================================

create table if not exists entregas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  endereco text not null,
  status entrega_status not null default 'pendente',
  data_saida timestamptz,
  data_entrega timestamptz
);

create index if not exists entregas_pedido_id_idx on entregas (pedido_id);

-- ==========================================================
-- RLS
-- ==========================================================
-- Regra geral: usuários autenticados (Luís e Clara, via Supabase Auth)
-- têm acesso total de gestão. O site público (anon key) só pode:
--   - ler produtos disponíveis
--   - inserir clientes, pedidos e pedido_itens (fluxo de checkout)
-- Nunca dar ao anon acesso a insumos, receitas, notas fiscais ou produção
-- (dados de custo interno).

alter table produtos enable row level security;
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
alter table insumos enable row level security;
alter table insumo_apelidos enable row level security;
alter table receitas enable row level security;
alter table receita_insumos enable row level security;
alter table notas_fiscais enable row level security;
alter table nota_itens enable row level security;
alter table producoes enable row level security;
alter table entregas enable row level security;

-- produtos: leitura pública do que está disponível; gestão completa autenticada
drop policy if exists "produtos_select_public" on produtos;
create policy "produtos_select_public" on produtos
  for select using (disponivel = true or auth.role() = 'authenticated');

drop policy if exists "produtos_write_auth" on produtos;
create policy "produtos_write_auth" on produtos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- clientes: site pode inserir (checkout); só autenticado lê e edita
drop policy if exists "clientes_insert_public" on clientes;
create policy "clientes_insert_public" on clientes
  for insert with check (true);

drop policy if exists "clientes_select_auth" on clientes;
create policy "clientes_select_auth" on clientes
  for select using (auth.role() = 'authenticated');

drop policy if exists "clientes_update_auth" on clientes;
create policy "clientes_update_auth" on clientes
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "clientes_delete_auth" on clientes;
create policy "clientes_delete_auth" on clientes
  for delete using (auth.role() = 'authenticated');

-- pedidos: site pode criar (origem=site); só autenticado lê e gerencia status
drop policy if exists "pedidos_insert_public" on pedidos;
create policy "pedidos_insert_public" on pedidos
  for insert with check (origem = 'site' or auth.role() = 'authenticated');

drop policy if exists "pedidos_select_auth" on pedidos;
create policy "pedidos_select_auth" on pedidos
  for select using (auth.role() = 'authenticated');

drop policy if exists "pedidos_update_auth" on pedidos;
create policy "pedidos_update_auth" on pedidos
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "pedidos_delete_auth" on pedidos;
create policy "pedidos_delete_auth" on pedidos
  for delete using (auth.role() = 'authenticated');

-- pedido_itens: site insere junto com o pedido; só autenticado lê e gerencia
drop policy if exists "pedido_itens_insert_public" on pedido_itens;
create policy "pedido_itens_insert_public" on pedido_itens
  for insert with check (true);

drop policy if exists "pedido_itens_select_auth" on pedido_itens;
create policy "pedido_itens_select_auth" on pedido_itens
  for select using (auth.role() = 'authenticated');

drop policy if exists "pedido_itens_update_auth" on pedido_itens;
create policy "pedido_itens_update_auth" on pedido_itens
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "pedido_itens_delete_auth" on pedido_itens;
create policy "pedido_itens_delete_auth" on pedido_itens
  for delete using (auth.role() = 'authenticated');

-- todo o resto (dados internos de custo/estoque/produção): só autenticado, ponto final
drop policy if exists "insumos_auth_all" on insumos;
create policy "insumos_auth_all" on insumos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "insumo_apelidos_auth_all" on insumo_apelidos;
create policy "insumo_apelidos_auth_all" on insumo_apelidos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "receitas_auth_all" on receitas;
create policy "receitas_auth_all" on receitas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "receita_insumos_auth_all" on receita_insumos;
create policy "receita_insumos_auth_all" on receita_insumos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "notas_fiscais_auth_all" on notas_fiscais;
create policy "notas_fiscais_auth_all" on notas_fiscais
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "nota_itens_auth_all" on nota_itens;
create policy "nota_itens_auth_all" on nota_itens
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "producoes_auth_all" on producoes;
create policy "producoes_auth_all" on producoes
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "entregas_auth_all" on entregas;
create policy "entregas_auth_all" on entregas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ==========================================================
-- TRIGGERS — updated_at automático
-- ==========================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists produtos_set_updated_at on produtos;
create trigger produtos_set_updated_at before update on produtos
  for each row execute function set_updated_at();

drop trigger if exists pedidos_set_updated_at on pedidos;
create trigger pedidos_set_updated_at before update on pedidos
  for each row execute function set_updated_at();

drop trigger if exists insumos_set_updated_at on insumos;
create trigger insumos_set_updated_at before update on insumos
  for each row execute function set_updated_at();

drop trigger if exists receitas_set_updated_at on receitas;
create trigger receitas_set_updated_at before update on receitas
  for each row execute function set_updated_at();

-- ==========================================================
-- FUNÇÃO — registrar produção (baixa de estoque atômica)
-- ==========================================================
-- Registra uma fornada e desconta dos insumos, proporcionalmente ao
-- rendimento da receita, numa única transação (evita baixa parcial se
-- algo falhar no meio do caminho). security definer porque precisa
-- atualizar `insumos` mesmo chamada por um usuário autenticado comum —
-- a policy de insumos já exige authenticated, isso só evita múltiplas
-- idas ao banco a partir do cliente.

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

  insert into producoes (receita_id, produto_id, quantidade_produzida, data)
  values (p_receita_id, p_produto_id, p_quantidade, coalesce(p_data, now()))
  returning id into v_producao_id;

  return v_producao_id;
end;
$$;

revoke all on function registrar_producao(uuid, uuid, int, timestamptz) from public;
grant execute on function registrar_producao(uuid, uuid, int, timestamptz) to authenticated;
