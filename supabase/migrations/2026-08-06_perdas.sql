-- Migration: registro de perdas
--
-- Cookie que queimou, caiu, passou do ponto. O prejuízo não é o preço de
-- venda — é o custo de produção, o dinheiro que já saiu em insumo e não vai
-- voltar em venda nenhuma. Lançar pelo preço de venda inventaria um lucro
-- que nunca existiu.
--
-- `custo_unitario` é congelado no momento do registro, mesma lógica de
-- preco_unitario em pedido_itens: o custo da receita muda quando o preço do
-- insumo muda, e uma perda de março não pode ser recalculada pelo custo de
-- hoje.
--
-- Os insumos NÃO são baixados aqui: eles já saíram dos lotes quando a fornada
-- foi registrada. Descontar de novo contaria o mesmo prejuízo duas vezes.

create table if not exists perdas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade int not null check (quantidade > 0),
  custo_unitario numeric(10, 2) not null check (custo_unitario >= 0),
  motivo text,
  data timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists perdas_data_idx on perdas (data);

alter table perdas enable row level security;

-- prejuízo é dado interno: o site anônimo não lê nem escreve
drop policy if exists "perdas_auth" on perdas;
create policy "perdas_auth" on perdas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- O que se perdeu deixa de existir como pronto pra vender. Mesmo padrão do
-- trigger de pedido_itens: a baixa mora no banco porque precisa valer venha
-- de onde vier a escrita, e a reversão (excluir a perda) devolve ao estoque.
create or replace function sincronizar_estoque_perda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform ajustar_estoque_produto(new.produto_id, -new.quantidade);
    return new;
  elsif tg_op = 'DELETE' then
    perform ajustar_estoque_produto(old.produto_id, old.quantidade);
    return old;
  elsif tg_op = 'UPDATE' then
    perform ajustar_estoque_produto(old.produto_id, old.quantidade);
    perform ajustar_estoque_produto(new.produto_id, -new.quantidade);
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists perdas_sincronizar_estoque on perdas;
create trigger perdas_sincronizar_estoque
after insert or update or delete on perdas
for each row execute function sincronizar_estoque_perda();
