-- Migration: composição de box dentro de um pedido + baixa de estoque
--
-- Depende da function ajustar_estoque_produto, criada em
-- 2026-07-13_estoque_pedido_itens_update_delete.sql — rodar essa primeiro.
--
-- Quando um item de pedido é uma box, pedido_itens sozinho não diz QUAIS
-- cookies foram escolhidos pra ir dentro dela naquele pedido específico
-- (isso é decidido na hora, pedido a pedido — ex: "2 Nutella + 2 Churros").
-- pedido_item_composicao guarda essa escolha, e é ela (não a linha da box
-- em pedido_itens) que desconta o estoque dos cookies de verdade.

create table if not exists pedido_item_composicao (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references pedido_itens(id) on delete cascade,
  cookie_produto_id uuid not null references produtos(id) on delete restrict,
  quantidade int not null check (quantidade > 0)
);

create index if not exists pedido_item_composicao_item_idx
  on pedido_item_composicao (pedido_item_id);

alter table pedido_item_composicao enable row level security;

-- mesmo padrão de pedido_itens: site e CRM podem inserir (é parte de criar
-- o pedido); só autenticado lê/edita/apaga.
drop policy if exists "pedido_item_composicao_insert_public" on pedido_item_composicao;
create policy "pedido_item_composicao_insert_public" on pedido_item_composicao
  for insert with check (true);

drop policy if exists "pedido_item_composicao_select_auth" on pedido_item_composicao;
create policy "pedido_item_composicao_select_auth" on pedido_item_composicao
  for select using (auth.role() = 'authenticated');

drop policy if exists "pedido_item_composicao_update_auth" on pedido_item_composicao;
create policy "pedido_item_composicao_update_auth" on pedido_item_composicao
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "pedido_item_composicao_delete_auth" on pedido_item_composicao;
create policy "pedido_item_composicao_delete_auth" on pedido_item_composicao
  for delete using (auth.role() = 'authenticated');

create or replace function sincronizar_estoque_composicao_box()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform ajustar_estoque_produto(new.cookie_produto_id, -new.quantidade);
    return new;
  elsif tg_op = 'DELETE' then
    perform ajustar_estoque_produto(old.cookie_produto_id, old.quantidade);
    return old;
  elsif tg_op = 'UPDATE' then
    perform ajustar_estoque_produto(old.cookie_produto_id, old.quantidade);
    perform ajustar_estoque_produto(new.cookie_produto_id, -new.quantidade);
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists pedido_item_composicao_sincronizar_estoque on pedido_item_composicao;
create trigger pedido_item_composicao_sincronizar_estoque
after insert or update or delete on pedido_item_composicao
for each row execute function sincronizar_estoque_composicao_box();
