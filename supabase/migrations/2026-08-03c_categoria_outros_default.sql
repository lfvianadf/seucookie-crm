-- Migration corretiva (parte 2 de 2) — rodar depois da parte 1.
--
-- Corrige o default e reclassifica o que a versão antiga marcou como 'secos'
-- sem ninguém ter escolhido.
--
-- ATENÇÃO: o update abaixo move TODOS os insumos que estão hoje em 'secos'
-- para 'outros'. Isso é o certo se ninguém classificou nada à mão ainda
-- (que é o caso logo depois de rodar a migration original). Se você já
-- ajustou algum insumo para 'secos' de propósito, comente o update e
-- reclassifique pela tela — não dá pra distinguir no banco o que foi
-- escolha de quem usou e o que foi o default antigo.

alter table insumos alter column categoria set default 'outros';

update insumos set categoria = 'outros' where categoria = 'secos';
