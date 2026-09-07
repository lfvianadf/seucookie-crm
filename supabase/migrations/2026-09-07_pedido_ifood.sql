-- Nova origem de pedido: iFood, vendido/entregue pelo próprio iFood.
-- Enum novo precisa de commit em transação própria antes de ser usado
-- (ver 2026-09-07b_pedido_ifood_valor_liquido.sql).
alter type pedido_origem add value 'ifood';
