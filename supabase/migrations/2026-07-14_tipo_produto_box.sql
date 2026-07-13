-- Migration: tipo_produto (cookie | box) + composição da box
--
-- Uma "box" não tem estoque próprio — o estoque exibido dela é a soma do
-- estoque dos cookies que podem ir dentro. produto_box_itens define esse
-- "cardápio" de cookies permitidos por box (many-to-many).
--
-- disponibilidade da box também é derivada (soma > 0) e calculada em
-- aplicação, não guardada nem sincronizada por trigger — evita duplicar
-- fonte de verdade. qtd_estoque da própria linha da box em `produtos`
-- fica sem uso pra esse tipo (não é lido nem exibido).

do $$ begin
  create type tipo_produto as enum ('cookie', 'box');
exception when duplicate_object then null; end $$;

alter table produtos add column if not exists tipo_produto tipo_produto not null default 'cookie';

create table if not exists produto_box_itens (
  box_id uuid not null references produtos(id) on delete cascade,
  cookie_id uuid not null references produtos(id) on delete cascade,
  primary key (box_id, cookie_id)
);

alter table produto_box_itens enable row level security;

drop policy if exists "produto_box_itens_select_public" on produto_box_itens;
create policy "produto_box_itens_select_public" on produto_box_itens
  for select using (true);

drop policy if exists "produto_box_itens_write_auth" on produto_box_itens;
create policy "produto_box_itens_write_auth" on produto_box_itens
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
