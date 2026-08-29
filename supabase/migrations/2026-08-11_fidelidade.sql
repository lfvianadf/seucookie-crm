-- Migration: cartão fidelidade
--
-- Regra: a cada 10 cookies comprados, 1 de cortesia.
--
-- A contagem NÃO é uma coluna somada a cada pedido. Ela é derivada dos
-- pedidos que já existem, menos os resgates já feitos. Um contador guardado
-- desanda em silêncio: pedido cancelado, item editado ou excluído deixariam
-- o número mentindo, e ninguém perceberia até um cliente cobrar a cortesia.
--
-- O que é guardado é só o RESGATE — o fato de você ter entregue o cookie
-- grátis, que não dá pra deduzir de lugar nenhum.

create table if not exists fidelidade_resgates (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  -- quantos cookies foram "gastos" neste resgate (normalmente 10)
  cookies_usados int not null default 10 check (cookies_usados > 0),
  data timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists fidelidade_resgates_cliente_idx
  on fidelidade_resgates (cliente_id);

alter table fidelidade_resgates enable row level security;

drop policy if exists "fidelidade_resgates_auth" on fidelidade_resgates;
create policy "fidelidade_resgates_auth" on fidelidade_resgates
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Cookies comprados por cliente, já descontando o que foi resgatado.
--
-- Conta a quantidade de cada item de pedido não-cancelado. Itens de box
-- contam pelos cookies de dentro (pedido_item_composicao), não pela linha da
-- box — senão uma caixa de 4 valeria 1 carimbo.
-- security_invoker: a view respeita o RLS de quem consulta, em vez de rodar
-- com os poderes de quem a criou. Sem isso ela viraria um vazamento da
-- tabela de clientes para o site anônimo.
create or replace view fidelidade_clientes
with (security_invoker = true) as
select
  c.id as cliente_id,
  c.nome,
  c.telefone,
  coalesce(compras.cookies, 0) as cookies_comprados,
  coalesce(resgates.usados, 0) as cookies_resgatados,
  coalesce(compras.cookies, 0) - coalesce(resgates.usados, 0) as cookies_no_cartao
from clientes c
left join (
  select
    p.cliente_id,
    sum(
      case
        -- box: soma os cookies escolhidos na composição
        when exists (
          select 1 from pedido_item_composicao pic
          where pic.pedido_item_id = pi.id
        )
        then coalesce((
          select sum(pic.quantidade) from pedido_item_composicao pic
          where pic.pedido_item_id = pi.id
        ), 0) * pi.quantidade
        else pi.quantidade
      end
    ) as cookies
  from pedidos p
  join pedido_itens pi on pi.pedido_id = p.id
  where p.status <> 'cancelado'
  group by p.cliente_id
) compras on compras.cliente_id = c.id
left join (
  select cliente_id, sum(cookies_usados) as usados
  from fidelidade_resgates
  group by cliente_id
) resgates on resgates.cliente_id = c.id;
