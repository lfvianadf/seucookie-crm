-- Fase 1 de "encomendas consignadas": separa varejo de encomenda.
--
-- Duas dimensões novas:
--
--   pedidos.tipo_venda — varejo | encomenda. Coluna e não tabela nova: a
--   encomenda tem a mesma anatomia de um pedido (cliente, itens, preço
--   congelado, estoque baixando por trigger). O que difere entre os dois é
--   QUANDO a venda vira faturamento, e isso é resolvido pelo ciclo de
--   acerto (fase 3), não pela tabela.
--
--   produtos.canal — varejo | encomenda | ambos. Enum e não bool: bool não
--   expressa "vale nos dois", e abrir um canal futuro (feira, evento)
--   exigiria outra coluna. Não reaproveita `capitulo` porque capitulo é a
--   voz do cardápio pro site público ("os clássicos") — sobrecarregá-lo
--   quebraria a vitrine.
--
-- Ambos entram com default que preserva o comportamento atual: todo pedido
-- e produto existente vira 'varejo', sem mudar nada do que já funciona.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pedido_tipo_venda') then
    create type pedido_tipo_venda as enum ('varejo', 'encomenda');
  end if;
  if not exists (select 1 from pg_type where typname = 'produto_canal') then
    create type produto_canal as enum ('varejo', 'encomenda', 'ambos');
  end if;
end
$$;

alter table pedidos
  add column if not exists tipo_venda pedido_tipo_venda not null default 'varejo';

alter table produtos
  add column if not exists canal produto_canal not null default 'varejo';

create index if not exists pedidos_tipo_venda_idx on pedidos (tipo_venda);
create index if not exists produtos_canal_idx on produtos (canal);

-- RLS: não confiar em `disponivel` sozinho para esconder preço de atacado.
-- Se alguém marcar um produto de encomenda como disponível por engano, a
-- policy ainda recusa — o vazamento fica impossível por regra do banco, não
-- por disciplina de cadastro.
drop policy if exists "produtos_select_public" on produtos;
create policy "produtos_select_public" on produtos
  for select using (
    (disponivel = true and canal <> 'encomenda') or auth.role() = 'authenticated'
  );
