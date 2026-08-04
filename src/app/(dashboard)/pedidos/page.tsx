import { createClient } from "@/lib/supabase/server";
import { PedidosKanban } from "@/components/pedidos-kanban";
import { NovoPedidoModal } from "@/components/novo-pedido-modal";
import { PageHeader } from "@/components/ui/page-header";

export default async function PedidosPage() {
  const supabase = await createClient();
  const [{ data: pedidos }, { data: produtos }, { data: boxItens }] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select(
          "id, status, origem, valor_total, observacoes, data_pedido, clientes(nome, telefone, endereco), pedido_itens(id, produto_id, quantidade, preco_unitario, produtos(nome, tipo_produto), pedido_item_composicao(quantidade, produtos(nome)))"
        )
        .order("data_pedido", { ascending: false }),
      supabase
        .from("produtos")
        .select(
          "id, nome, preco, capitulo, tipo_produto, qtd_cookies_box, acrescimo_box"
        )
        .eq("disponivel", true)
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

      <PedidosKanban pedidosIniciais={pedidos ?? []} produtos={produtosLista} />
    </div>
  );
}
