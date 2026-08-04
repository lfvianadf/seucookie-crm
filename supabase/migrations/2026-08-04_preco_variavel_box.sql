-- Migration: preço variável da box
--
-- Regra: preço da box = preço base + Σ (acréscimo do cookie × quantidade).
-- Ex: box de 4 a R$ 39,90, Pistache +R$ 3,00 → 2 Nutella + 2 Pistache = R$ 45,90.
--
-- Dois campos, cada um só faz sentido num tipo de produto:
--
--   qtd_cookies_box  — só em produtos tipo 'box'. Quantos cookies a caixa
--                      comporta. Nullable de propósito: box sem esse campo
--                      preenchido continua com composição livre, do jeito
--                      que funcionava antes. Assim a migration não trava o
--                      cadastro de pedido das boxes que já existem.
--
--   acrescimo_box    — só em produtos tipo 'cookie'. Quanto aquele sabor
--                      soma ao entrar numa box. Default 0: cookie normal
--                      não encarece a caixa, e é o comportamento de hoje.
--
-- Não vale usar `preco` do cookie aqui: aquele é o preço de venda avulso, e
-- dentro da box o sabor custa outra coisa (em geral zero). Misturar os dois
-- faria a box somar o valor cheio de cada cookie.

alter table produtos
  add column if not exists qtd_cookies_box int
    check (qtd_cookies_box is null or qtd_cookies_box > 0);

alter table produtos
  add column if not exists acrescimo_box numeric(10, 2) not null default 0
    check (acrescimo_box >= 0);

comment on column produtos.qtd_cookies_box is
  'Só para tipo_produto = box: quantos cookies a caixa comporta. Null = composição livre.';

comment on column produtos.acrescimo_box is
  'Só para tipo_produto = cookie: quanto esse sabor soma ao preço da box.';
