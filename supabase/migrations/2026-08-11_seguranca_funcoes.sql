-- Migration de segurança: fecha as funções internas para o público
--
-- Problema encontrado pelo linter do Supabase: todas as funções de
-- estoque/custo são SECURITY DEFINER — necessário, porque precisam escrever
-- em tabelas protegidas por RLS — mas isso significa que rodam IGNORANDO o
-- RLS. Como o PostgREST expõe toda função do schema public em
-- /rest/v1/rpc/<nome>, qualquer um com a anon key (que está no bundle do
-- site) podia forjar produção, mexer em lote de compra ou zerar estoque.
--
-- Cuidado que custou uma tentativa: revogar de `anon` não basta. O EXECUTE
-- vem de um GRANT ao papel PUBLIC, herdado por todos os roles — é de PUBLIC
-- que precisa ser revogado primeiro.
--
-- O site continua funcionando: ele só usa buscar_cliente_por_telefone (que
-- segue liberada) e insert direto em clientes/pedidos, protegido por RLS.
-- Os triggers também seguem: rodam dentro do banco, sem passar pelo
-- PostgREST, e não dependem do EXECUTE concedido a roles.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as assinatura, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'ajustar_estoque_produto','sincronizar_estoque_pedido_item',
        'sincronizar_estoque_composicao_box','sincronizar_estoque_perda',
        'sincronizar_insumo_por_lotes','custo_medio_insumo',
        'consumir_insumo_fifo','reverter_estoque_producao',
        'registrar_producao','atualizar_producao','estornar_producao',
        'registrar_entrada_insumo','editar_lote_insumo','excluir_lote_insumo',
        'set_updated_at'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.assinatura);

    -- só as que o CRM chama de verdade voltam, e apenas para quem fez login
    if fn.proname in (
      'registrar_producao','atualizar_producao','estornar_producao',
      'registrar_entrada_insumo','editar_lote_insumo','excluir_lote_insumo'
    ) then
      execute format('grant execute on function %s to authenticated', fn.assinatura);
    end if;
  end loop;
end
$$;

-- search_path fixo: sem isso, quem chama pode trocar o schema resolvido
alter function public.set_updated_at() set search_path = public;
