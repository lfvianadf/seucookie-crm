-- Fase 3 de "encomendas consignadas": o ciclo de acerto.
--
-- O acerto é um EVENTO NOVO, não uma edição de pedido_itens. Editar a
-- quantidade pra baixo faria o trigger de estoque devolver automaticamente,
-- mas apagaria o fato de que 200 cookies saíram fisicamente e 30 voltaram —
-- mesmo espírito de `perdas` e `fidelidade_resgates`: guarda o que não dá
-- pra deduzir de outro lugar.
--
-- Arquivo separado (sufixo c) porque depende de pedido_tipo_venda, criado
-- em 2026-08-31_tipo_venda_e_canal.sql.

create type encomenda_destino_sobra as enum ('estoque', 'perda');

create table if not exists encomenda_acertos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  data timestamptz not null default now(),
  -- congelado, não calculado: a igreja pode arredondar ou negociar. O que
  -- entra no Financeiro é o que EFETIVAMENTE entrou, mesma regra de
  -- preco_unitario congelado em pedido_itens.
  valor_recebido numeric(10, 2) not null,
  observacoes text,
  created_at timestamptz not null default now()
);

-- um acerto por encomenda: acerto errado se exclui e refaz, não se edita
create unique index if not exists encomenda_acertos_pedido_idx
  on encomenda_acertos (pedido_id);

create table if not exists encomenda_acerto_itens (
  id uuid primary key default gen_random_uuid(),
  acerto_id uuid not null references encomenda_acertos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  qtd_entregue int not null check (qtd_entregue > 0),
  qtd_sobra int not null check (qtd_sobra >= 0),
  destino_sobra encomenda_destino_sobra not null,
  preco_unitario numeric(10, 2) not null,
  -- vínculo com a perda registrada, se destino_sobra='perda' — permite
  -- desfazer o acerto sem deixar perda órfã
  perda_id uuid references perdas(id) on delete set null,
  constraint sobra_nao_maior_que_entregue check (qtd_sobra <= qtd_entregue)
);

create index if not exists encomenda_acerto_itens_acerto_idx
  on encomenda_acerto_itens (acerto_id);

alter table encomenda_acertos enable row level security;
alter table encomenda_acerto_itens enable row level security;

drop policy if exists "encomenda_acertos_auth" on encomenda_acertos;
create policy "encomenda_acertos_auth" on encomenda_acertos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "encomenda_acerto_itens_auth" on encomenda_acerto_itens;
create policy "encomenda_acerto_itens_auth" on encomenda_acerto_itens
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- A sobra volta ao estoque INCONDICIONALMENTE, mesmo quando o destino é
-- perda. Quando for perda, a server action chama registrar_perda logo em
-- seguida (mesmo trigger de sincronizar_estoque_perda), que baixa de novo e
-- contabiliza o prejuízo no Financeiro. Saldo líquido de estoque fica
-- correto nos dois casos, e a perda real aparece registrada em vez de
-- silenciosamente reduzir a venda.
create or replace function sincronizar_estoque_acerto_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.qtd_sobra > 0 then
      perform ajustar_estoque_produto(new.produto_id, new.qtd_sobra);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.qtd_sobra > 0 then
      perform ajustar_estoque_produto(old.produto_id, -old.qtd_sobra);
    end if;
    return old;
  end if;
  return null;
end;
$$;

-- sem UPDATE de propósito: acerto errado se exclui e refaz (ver comentário
-- da tabela). O trigger só cobre INSERT/DELETE.
drop trigger if exists encomenda_acerto_itens_sincronizar_estoque on encomenda_acerto_itens;
create trigger encomenda_acerto_itens_sincronizar_estoque
after insert or delete on encomenda_acerto_itens
for each row execute function sincronizar_estoque_acerto_item();

-- mesma disciplina de segurança da fase 1: função interna nunca exposta via
-- PostgREST, nem pra authenticated (só o trigger a chama).
revoke all on function sincronizar_estoque_acerto_item() from public, anon, authenticated;
