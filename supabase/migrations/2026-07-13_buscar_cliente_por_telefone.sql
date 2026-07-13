-- Migration: buscar_cliente_por_telefone
-- Motivo: o site (anon) precisa achar um cliente pelo telefone antes de criar
-- um novo (pra não duplicar), mas não pode ter select livre em `clientes` —
-- isso vazaria nome/telefone/endereço de todo mundo pra qualquer um com a
-- anon key (que é pública, vai no bundle do site). RLS só controla linha
-- visível, não o formato da query, então "using (true)" liberaria um dump
-- da tabela inteira. Uma function security definer resolve: devolve só o
-- cliente que bate com o telefone exato passado como parâmetro.
--
-- Rodar uma vez no SQL Editor do Supabase. Idempotente (create or replace).

create or replace function buscar_cliente_por_telefone(p_telefone text)
returns table (id uuid, nome text, endereco text)
language sql
security definer
set search_path = public
stable
as $$
  select id, nome, endereco
  from clientes
  where telefone = p_telefone
  limit 1;
$$;

revoke all on function buscar_cliente_por_telefone(text) from public;
grant execute on function buscar_cliente_por_telefone(text) to anon, authenticated;
