-- Fidelidade não deve contar venda de encomenda (igreja, consignado).
--
-- O cartão existe pra recompensar o consumidor final que repete compra. Uma
-- encomenda de 200 cookies daria 20 cortesias de uma vez à igreja, e o que
-- for devolvido como sobra (fase 3) contaria como comprado mesmo sem ter
-- sido vendido. Encomenda é canal de distribuição, não cliente fidelizado.
--
-- Arquivo separado (sufixo b) porque depende do enum pedido_tipo_venda
-- criado em 2026-08-31_tipo_venda_e_canal.sql — precisa rodar depois.
--
-- create or replace mantém o mesmo contrato de colunas — nada nas telas ou
-- actions de fidelidade precisa mudar.

create or replace view fidelidade_clientes
with (security_invoker = true) as
select
  c.id as cliente_id,
  c.nome,
  c.telefone,
  coalesce(compras.cookies, 0) as cookies_comprados,
  coalesce(resgates.usados, 0) as cookies_resgatados,
  coalesce(compras.cookies, 0) - coalesce(resgates.usados, 0) as cookies_no_cartao
from clientes c
left join (
  select
    p.cliente_id,
    sum(
      case
        when exists (
          select 1 from pedido_item_composicao pic
          where pic.pedido_item_id = pi.id
        )
        then coalesce((
          select sum(pic.quantidade) from pedido_item_composicao pic
          where pic.pedido_item_id = pi.id
        ), 0) * pi.quantidade
        else pi.quantidade
      end
    ) as cookies
  from pedidos p
  join pedido_itens pi on pi.pedido_id = p.id
  where p.status <> 'cancelado'
    and p.tipo_venda = 'varejo'
  group by p.cliente_id
) compras on compras.cliente_id = c.id
left join (
  select cliente_id, sum(cookies_usados) as usados
  from fidelidade_resgates
  group by cliente_id
) resgates on resgates.cliente_id = c.id;
