import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, MapPin, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, status, valor_total, data_pedido, pedido_itens(quantidade, produtos(nome))"
    )
    .eq("cliente_id", id)
    .order("data_pedido", { ascending: false });

  const totalGasto = (pedidos ?? [])
    .filter((p) => p.status !== "cancelado")
    .reduce((soma, p) => soma + Number(p.valor_total), 0);

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutro-500 transition-colors duration-150 hover:text-berinjela"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        Clientes
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-berinjela">{cliente.nome}</h1>
      <div className="mb-6 space-y-0.5">
        <p className="flex items-center gap-1.5 text-sm text-neutro-600">
          <Phone className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
          {cliente.telefone}
        </p>
        {cliente.endereco && (
          <p className="flex items-center gap-1.5 text-sm text-neutro-600">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
            {cliente.endereco}
          </p>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-berinjela">
          Pedidos ({pedidos?.length ?? 0})
        </h2>
        {totalGasto > 0 && (
          <p className="text-sm text-neutro-500">
            Total gasto:{" "}
            <span className="font-semibold text-berinjela">
              R$ {totalGasto.toFixed(2)}
            </span>
          </p>
        )}
      </div>

      {pedidos?.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Data
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Itens
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Valor
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  className="border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 text-neutro-500">
                    {new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-neutro-700">
                    {pedido.pedido_itens
                      .map((item) => `${item.quantidade}x ${item.produtos?.nome ?? "—"}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    R$ {Number(pedido.valor_total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[pedido.status]}>
                      {STATUS_LABEL[pedido.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-berinjela-50 text-neutro-500">
            <ClipboardList className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-neutro-500">
            Esse cliente ainda não fez nenhum pedido.
          </p>
        </div>
      )}
    </div>
  );
}
