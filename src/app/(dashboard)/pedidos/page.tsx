import { createClient } from "@/lib/supabase/server";
import { PedidosKanban } from "@/components/pedidos-kanban";
import { NovoPedidoModal } from "@/components/novo-pedido-modal";

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
        .select("id, nome, preco, capitulo, tipo_produto")
        .eq("disponivel", true)
        .order("capitulo", { ascending: true })
        .order("nome", { ascending: true }),
      supabase.from("produto_box_itens").select("box_id, cookie_id"),
    ]);

  const produtosLista = produtos ?? [];

  // pra cada box, a lista de cookies que podem ir dentro — cruza com os
  // dados de produtos que já temos (evita join ambíguo: produto_box_itens
  // tem duas FKs pra produtos, uma pra box outra pro cookie).
  const boxCookies: Record<string, { id: string; nome: string; preco: number }[]> =
    {};
  for (const item of boxItens ?? []) {
    const cookie = produtosLista.find((p) => p.id === item.cookie_id);
    if (!cookie) continue;
    (boxCookies[item.box_id] ??= []).push({
      id: cookie.id,
      nome: cookie.nome,
      preco: cookie.preco,
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">Pedidos</h1>
          <p className="text-sm text-neutro-500">
            Arraste o cartão pra mudar o status, ou use o seletor.
          </p>
        </div>
        <NovoPedidoModal produtos={produtosLista} boxCookies={boxCookies} />
      </div>

      <PedidosKanban pedidosIniciais={pedidos ?? []} produtos={produtosLista} />
    </div>
  );
}
