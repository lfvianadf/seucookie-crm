import { createClient } from "@/lib/supabase/server";
import { PedidosKanban } from "@/components/pedidos-kanban";
import { NovoPedidoModal } from "@/components/novo-pedido-modal";

export default async function PedidosPage() {
  const supabase = await createClient();
  const [{ data: pedidos }, { data: produtos }] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, status, origem, valor_total, observacoes, data_pedido, clientes(nome, telefone, endereco), pedido_itens(quantidade, preco_unitario, produtos(nome))"
      )
      .order("data_pedido", { ascending: false }),
    supabase
      .from("produtos")
      .select("id, nome, preco, capitulo")
      .eq("disponivel", true)
      .order("capitulo", { ascending: true })
      .order("nome", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">Pedidos</h1>
          <p className="text-sm text-neutro-500">
            Arraste o cartão pra mudar o status, ou use o seletor.
          </p>
        </div>
        <NovoPedidoModal produtos={produtos ?? []} />
      </div>

      <PedidosKanban pedidosIniciais={pedidos ?? []} />
    </div>
  );
}
