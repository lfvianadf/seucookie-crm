-- Ajuste pontual: corrige a escala do custo médio dos insumos já
-- cadastrados (estava em R$/grama ou R$/ml cru, agora deve ser R$/kg ou
-- R$/L) e semeia preco_atual a partir do valor já corrigido.
-- Rodar uma vez só, depois das duas colunas (numero_compras, preco_atual)
-- já existirem na tabela.

-- 0. garante que as colunas existem (idempotente, pode rodar de novo sem medo)
alter table insumos add column if not exists numero_compras int not null default 0;
alter table insumos add column if not exists preco_atual numeric(12, 6) not null default 0;

-- 1. confira ANTES de aplicar — o que vai virar o quê
select
  nome,
  unidade_base,
  custo_medio_por_unidade as custo_atual_cru,
  case when unidade_base = 'un'
    then custo_medio_por_unidade
    else round(custo_medio_por_unidade * 1000, 6)
  end as custo_corrigido_kg_l_un
from insumos
order by nome;

-- 2. corrige a escala: g/ml estavam por grama/ml cru, viram por kg/L.
-- "un" não muda (não tem o que normalizar).
update insumos
set custo_medio_por_unidade = round(custo_medio_por_unidade * 1000, 6)
where unidade_base in ('g', 'ml');

-- 3. marca que o valor atual já representa 1 compra — assim a próxima nota
-- validada faz média com esse valor em vez de tratá-lo como se não existisse
-- (o que faria a primeira compra nova sobrescrever tudo, ignorando o histórico).
update insumos
set numero_compras = 1
where custo_medio_por_unidade > 0 and numero_compras = 0;

-- 4. semeia preco_atual com o custo médio já corrigido, só onde ainda está 0
-- (não sobrescreve se você já tiver setado manualmente algo ali).
update insumos
set preco_atual = custo_medio_por_unidade
where preco_atual = 0;

-- 5. confira DEPOIS
select nome, unidade_base, custo_medio_por_unidade, preco_atual, numero_compras
from insumos
order by nome;
