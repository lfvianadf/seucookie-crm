-- Migration: qtd_estoque em produtos + baixa automática ao criar pedido
--
-- Regra: toda vez que um item de pedido é criado, desconta a quantidade do
-- estoque do produto. Se o estoque chegar a 0, o produto fica indisponível
-- automaticamente.
--
-- Isso precisa ser um TRIGGER (não código no CRM) porque pedido_itens é
-- inserido por duas origens diferentes — o CRM (usuário autenticado) e o
-- site público (anon, direto via supabase-js) — e a regra precisa valer
-- pras duas, sempre, sem depender de qual código chamou o insert.

alter table produtos add column if not exists qtd_estoque int not null default 0;

create or replace function baixar_estoque_produto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_novo_estoque int;
begin
  update produtos
  set qtd_estoque = greatest(qtd_estoque - new.quantidade, 0)
  where id = new.produto_id
  returning qtd_estoque into v_novo_estoque;

  if v_novo_estoque is not null and v_novo_estoque <= 0 then
    update produtos set disponivel = false where id = new.produto_id;
  end if;

  return new;
end;
$$;

drop trigger if exists pedido_itens_baixar_estoque on pedido_itens;
create trigger pedido_itens_baixar_estoque
after insert on pedido_itens
for each row execute function baixar_estoque_produto();
