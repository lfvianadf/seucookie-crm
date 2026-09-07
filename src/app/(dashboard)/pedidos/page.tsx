import { Suspense } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PedidosKanban } from "@/components/pedidos-kanban";
import { NovoPedidoModal } from "@/components/novo-pedido-modal";
import { PageHeader } from "@/components/ui/page-header";
import { SeletorMes } from "@/components/seletor-mes";
import { mesAtual, intervaloDoMes } from "@/lib/competencia";

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; q?: string }>;
}) {
  const { mes: mesParam, q } = await searchParams;
  const mes = mesParam ?? mesAtual();
  const { inicio, fim } = intervaloDoMes(mes);

  const supabase = await createClient();

  let queryPedidos = supabase
    .from("pedidos")
    .select(
      "id, status, origem, valor_total, valor_liquido_recebido, observacoes, data_pedido, clientes(nome, telefone, endereco), pedido_itens(id, produto_id, quantidade, preco_unitario, produtos(nome, tipo_produto), pedido_item_composicao(quantidade, produtos(nome)))"
    )
    // encomenda tem tela própria (/encomendas) — este Kanban é só varejo
    .eq("tipo_venda", "varejo")
    .gte("data_pedido", inicio.toISOString())
    .lt("data_pedido", fim.toISOString())
    .order("data_pedido", { ascending: false });

  if (q) {
    // busca é por cliente (nome ou telefone), que fica em outra tabela —
    // acha os ids que batem primeiro, mesma normalização de telefone já
    // usada em /clientes, depois filtra pedidos por esses ids
    const digitos = q.replace(/\D/g, "");
    const { data: clientesEncontrados } = await supabase
      .from("clientes")
      .select("id")
      .or(
        digitos
          ? `telefone.ilike.%${digitos}%,nome.ilike.%${q}%`
          : `nome.ilike.%${q}%`
      );

    const idsClientes = (clientesEncontrados ?? []).map((c) => c.id);
    // sem cliente encontrado, força zero resultado em vez de devolver tudo
    queryPedidos = queryPedidos.in("cliente_id", idsClientes.length ? idsClientes : ["-"]);
  }

  const [{ data: pedidos }, { data: produtos }, { data: boxItens }] =
    await Promise.all([
      queryPedidos,
      supabase
        .from("produtos")
        .select(
          "id, nome, preco, capitulo, tipo_produto, qtd_cookies_box, acrescimo_box"
        )
        .eq("disponivel", true)
        // canal já garante que produto de encomenda não aparece aqui, mesmo
        // que disponivel esteja errado — não depende só do RLS do site
        .in("canal", ["varejo", "ambos"])
        .order("capitulo", { ascending: true })
        .order("nome", { ascending: true }),
      supabase.from("produto_box_itens").select("box_id, cookie_id"),
    ]);

  const produtosLista = produtos ?? [];

  // pra cada box, a lista de cookies que podem ir dentro — cruza com os
  // dados de produtos que já temos (evita join ambíguo: produto_box_itens
  // tem duas FKs pra produtos, uma pra box outra pro cookie).
  const boxCookies: Record<
    string,
    { id: string; nome: string; preco: number; acrescimo_box: number }[]
  > = {};
  for (const item of boxItens ?? []) {
    const cookie = produtosLista.find((p) => p.id === item.cookie_id);
    if (!cookie) continue;
    (boxCookies[item.box_id] ??= []).push({
      id: cookie.id,
      nome: cookie.nome,
      preco: cookie.preco,
      acrescimo_box: cookie.acrescimo_box,
    });
  }

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Arraste o cartão pra mudar o status, ou use o seletor."
        action={
          <NovoPedidoModal produtos={produtosLista} boxCookies={boxCookies} />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* SeletorMes usa useSearchParams, que exige um limite de Suspense */}
        <Suspense fallback={<div className="h-8" />}>
          <SeletorMes mes={mes} />
        </Suspense>

        <form method="get" className="min-w-0 flex-1 sm:max-w-xs">
          {/* preserva o mês selecionado — senão a busca reseta esse filtro */}
          <input type="hidden" name="mes" value={mes} />
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutro-400"
              strokeWidth={1.75}
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome ou telefone"
              className="w-full rounded-lg border border-border-strong bg-white py-2.5 pl-9 pr-3 text-sm text-berinjela outline-none transition-all duration-150 ease-out placeholder:text-berinjela-100 focus:border-rosa focus:shadow-[0_0_0_3px_var(--ring)]"
            />
          </div>
        </form>
      </div>

      <PedidosKanban pedidosIniciais={pedidos ?? []} produtos={produtosLista} />
    </div>
  );
}
