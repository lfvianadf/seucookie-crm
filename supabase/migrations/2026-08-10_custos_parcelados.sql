-- Migration: custos parcelados
--
-- Antes o custo só era "uma vez" ou "recorrente" (booleano). Agora são três
-- casos, e um booleano não dá conta:
--
--   unica      — cai só na competência em que foi lançado
--   recorrente — repete todo mês, sem fim, até ser encerrado
--   parcelado  — repete por `parcelas` meses e some sozinho
--
-- `valor` continua sendo o valor DA PARCELA, não o total da compra: é como
-- vem na fatura, e evita divisão com sobra de centavo.
--
-- Assim como a recorrência, as parcelas são projetadas na exibição em vez de
-- virarem N linhas no banco. Corrigir o valor de uma compra em 10x não pode
-- exigir caçar e editar dez cópias.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_custo') then
    create type tipo_custo as enum ('unica', 'recorrente', 'parcelado');
  end if;
end
$$;

alter table custos_mensais
  add column if not exists tipo tipo_custo not null default 'unica';

alter table custos_mensais
  add column if not exists parcelas int
    check (parcelas is null or parcelas > 1);

-- migra o booleano existente: o que era recorrente continua recorrente
update custos_mensais set tipo = 'recorrente' where recorrente = true;

-- parcelado exige número de parcelas; os outros dois não podem ter
alter table custos_mensais drop constraint if exists custos_mensais_parcelas_coerentes;
alter table custos_mensais add constraint custos_mensais_parcelas_coerentes
  check (
    (tipo = 'parcelado' and parcelas is not null)
    or (tipo <> 'parcelado' and parcelas is null)
  );

-- `recorrente` fica como coluna legada por ora: removê-la agora quebraria
-- qualquer request em voo durante o deploy. Nada novo escreve nela.
comment on column custos_mensais.recorrente is
  'Legado — substituído por tipo. Mantido para não quebrar deploy em andamento.';
