-- Seu Cookie CRM — storage (buckets + policies)
-- Rodar no SQL Editor do Supabase, depois do schema.sql.
-- Idempotente: pode rodar de novo sem duplicar.

-- bucket "seucookie" já existe (criado manualmente, público) — fotos de produtos.
-- garante que está marcado como público, sem recriar.
update storage.buckets set public = true where id = 'seucookie';

-- bucket "notas-fiscais" — fotos de cupom/nota, privado (tem dado de custo interno).
insert into storage.buckets (id, name, public)
values ('notas-fiscais', 'notas-fiscais', false)
on conflict (id) do nothing;

-- ==========================================================
-- policies — bucket seucookie (fotos de produtos)
-- ==========================================================

drop policy if exists "seucookie_select_public" on storage.objects;
create policy "seucookie_select_public" on storage.objects
  for select using (bucket_id = 'seucookie');

drop policy if exists "seucookie_insert_auth" on storage.objects;
create policy "seucookie_insert_auth" on storage.objects
  for insert with check (bucket_id = 'seucookie' and auth.role() = 'authenticated');

drop policy if exists "seucookie_update_auth" on storage.objects;
create policy "seucookie_update_auth" on storage.objects
  for update using (bucket_id = 'seucookie' and auth.role() = 'authenticated');

drop policy if exists "seucookie_delete_auth" on storage.objects;
create policy "seucookie_delete_auth" on storage.objects
  for delete using (bucket_id = 'seucookie' and auth.role() = 'authenticated');

-- ==========================================================
-- policies — bucket notas-fiscais (privado, só autenticado)
-- ==========================================================

drop policy if exists "notas_fiscais_bucket_auth_all" on storage.objects;
create policy "notas_fiscais_bucket_auth_all" on storage.objects
  for all
  using (bucket_id = 'notas-fiscais' and auth.role() = 'authenticated')
  with check (bucket_id = 'notas-fiscais' and auth.role() = 'authenticated');
