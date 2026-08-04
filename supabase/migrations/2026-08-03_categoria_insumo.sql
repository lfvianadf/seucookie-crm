-- Migration: categoria dos insumos
--
-- A lista de insumos vira uma parede indiferenciada rápido — agrupar por
-- categoria é o que torna possível achar "aquele creme" sem ler tudo.
--
-- Enum (e não tabela de categorias) porque o conjunto é pequeno, estável e
-- decidido pelo negócio: um seletor curto é mais rápido de usar no celular e
-- impede duplicata por digitação ("Topping" vs "topping").
--
-- 'custos' é o escape hatch para o que não é matéria-prima mas entra no custo
-- do cookie (gás, energia, embalagem de entrega). Continua sendo um insumo
-- normal: entra na ficha técnica com uma quantidade e é somado ao custo pelo
-- mesmo caminho de sempre — nenhuma mecânica nova de cálculo.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_insumo') then
    create type categoria_insumo as enum (
      'secos',
      'molhados',
      'cremes',
      'topping',
      'embalagens',
      'outros',
      'custos'
    );
  end if;
end
$$;

-- default 'outros' para as linhas que já existem: é um balde neutro, honesto
-- sobre o fato de ninguém ter classificado ainda. Chutar 'secos' encheria a
-- categoria de coisa errada e ninguém perceberia que faltava revisar.
alter table insumos
  add column if not exists categoria categoria_insumo not null default 'outros';

-- a tela lista agrupando por categoria e ordenando por nome dentro de cada uma
create index if not exists insumos_categoria_idx on insumos (categoria, nome);
