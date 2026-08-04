-- Migration corretiva (parte 1 de 2) — RODAR ESTA SOZINHA, ANTES DA PARTE 2.
--
-- Contexto: a 2026-08-03_categoria_insumo.sql foi aplicada numa versão em que
-- 'outros' e 'chocolates' ainda não existiam e o default era 'secos'. Quem já
-- rodou aquela ficou com o enum incompleto e com todos os insumos antigos
-- marcados como secos. Numa base nova esta migration não faz nada — o enum já
-- nasce completo.
--
-- Precisa ser um arquivo separado porque o Postgres não deixa usar um valor
-- de enum na mesma transação em que ele foi adicionado. Rodar junto com a
-- parte 2 dá "unsafe use of new value of enum type".

alter type categoria_insumo add value if not exists 'outros' after 'embalagens';
alter type categoria_insumo add value if not exists 'chocolates' after 'cremes';
