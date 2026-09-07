-- Quanto efetivamente entra depois da comissão/taxa do iFood. Nullable e sem
-- default: só é preenchido pra pedidos de origem 'ifood' — todo outro pedido
-- segue usando valor_total normalmente no Financeiro.
alter table pedidos add column valor_liquido_recebido numeric(10,2);
