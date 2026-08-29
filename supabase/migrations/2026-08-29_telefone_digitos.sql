-- Migration: telefone sempre em dígitos
--
-- O telefone é a chave que reencontra o cliente e alimenta o cartão
-- fidelidade. Se um está gravado como "(84) 99999-8888" e a busca procura
-- "84999998888", aquele cliente nunca mais é encontrado — o próximo pedido
-- dele cria um cadastro novo e o cartão se divide em dois.
--
-- Verificado antes de aplicar: nenhum par de telefones colidia ao virar só
-- dígitos, então nada precisou ser fundido.

update clientes
set telefone = regexp_replace(telefone, '[^0-9]', '', 'g')
where telefone ~ '[^0-9]';

-- Impede que o problema volte: o banco recusa qualquer telefone que não seja
-- dígitos, mesmo se o site ou uma tela nova esquecer de normalizar.
alter table clientes drop constraint if exists clientes_telefone_digitos;
alter table clientes add constraint clientes_telefone_digitos
  check (telefone ~ '^[0-9]+$');
