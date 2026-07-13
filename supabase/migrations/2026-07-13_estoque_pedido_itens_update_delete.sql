-- Migration: estoque reage a UPDATE e DELETE em pedido_itens, não só INSERT
--
-- Motivo: agora dá pra editar um pedido (mudar quantidade, remover item) e
-- excluir um pedido inteiro pelo CRM. O trigger anterior (pedido_itens_baixar_estoque)
-- só descontava estoque na criação — editar/excluir pedido não devolvia nada
-- pro estoque, e diminuir uma quantidade também não ajustava. Substitui por
-- um trigger que cobre os três casos, sempre calculando o delta certo.

create or replace function ajustar_estoque_produto(p_produto_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estoque int;
begin
  update produtos
  set qtd_estoque = greatest(qtd_estoque + p_delta, 0)
  where id = p_produto_id
  returning qtd_estoque into v_estoque;

  if v_estoque is not null then
    update produtos set disponivel = (v_estoque > 0) where id = p_produto_id;
  end if;
end;
$$;

create or replace function sincronizar_estoque_pedido_item()
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
    -- devolve a quantidade antiga e desconta a nova — cobre tanto mudança
    -- de quantidade quanto (no caso raro) troca do produto do item
    perform ajustar_estoque_produto(old.produto_id, old.quantidade);
    perform ajustar_estoque_produto(new.produto_id, -new.quantidade);
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists pedido_itens_baixar_estoque on pedido_itens;
drop function if exists baixar_estoque_produto();

drop trigger if exists pedido_itens_sincronizar_estoque on pedido_itens;
create trigger pedido_itens_sincronizar_estoque
after insert or update or delete on pedido_itens
for each row execute function sincronizar_estoque_pedido_item();
