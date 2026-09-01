"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, MapPin, Stamp, ClipboardList } from "lucide-react";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buscarPedidosDoCliente } from "@/lib/actions/clientes";
import { formatarTelefone } from "@/lib/telefone";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string | null;
};

type Pedido = {
  id: string;
  status: keyof typeof STATUS_LABEL;
  valor_total: number;
  data_pedido: string;
  pedido_itens: { quantidade: number; produtos: { nome: string } | null }[];
};

export function ClienteDetalheModal({
  cliente,
  onClose,
}: {
  cliente: Cliente | null;
  onClose: () => void;
}) {
  // pedidosPorCliente guarda o resultado por id, então trocar de cliente ou
  // fechar e reabrir o modal nunca mostra o histórico de outra pessoa
  // brevemente enquanto a nova busca carrega
  const [pedidosPorCliente, setPedidosPorCliente] = useState<
    Record<string, Pedido[]>
  >({});

  useEffect(() => {
    if (!cliente || pedidosPorCliente[cliente.id]) return;
    let ativo = true;
    buscarPedidosDoCliente(cliente.id).then((dados) => {
      if (ativo) {
        setPedidosPorCliente((prev) => ({ ...prev, [cliente.id]: dados as Pedido[] }));
      }
    });
    return () => {
      ativo = false;
    };
  }, [cliente, pedidosPorCliente]);

  const pedidos = cliente ? (pedidosPorCliente[cliente.id] ?? null) : null;

  const totalGasto = (pedidos ?? [])
    .filter((p) => p.status !== "cancelado")
    .reduce((soma, p) => soma + Number(p.valor_total), 0);

  return (
    <Modal
      open={!!cliente}
      onClose={onClose}
      title={cliente?.nome ?? "Cliente"}
      maxWidth="max-w-xl"
    >
      {cliente && (
        <div className="space-y-5">
          <div className="rounded-lg bg-berinjela-50 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-sm text-neutro-700">
              <Phone className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
              {formatarTelefone(cliente.telefone)}
            </p>
            {cliente.endereco && (
              <p className="flex items-center gap-1.5 text-sm text-neutro-700">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
                {cliente.endereco}
              </p>
            )}
          </div>

          <Link
            href="/fidelidade"
            className="flex items-center gap-2 text-sm text-neutro-500 transition-colors duration-150 hover:text-berinjela"
          >
            <Stamp className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Ver cartão fidelidade
          </Link>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutro-500">
                Pedidos {pedidos ? `(${pedidos.length})` : ""}
              </p>
              {totalGasto > 0 && (
                <p className="text-xs text-neutro-500">
                  Total gasto:{" "}
                  <span className="font-semibold text-berinjela">
                    R$ {totalGasto.toFixed(2)}
                  </span>
                </p>
              )}
            </div>

            {pedidos === null && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {pedidos?.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-white px-6 py-8 text-center">
                <ClipboardList className="mb-2 h-5 w-5 text-neutro-400" strokeWidth={1.75} />
                <p className="text-sm text-neutro-500">
                  Esse cliente ainda não fez nenhum pedido.
                </p>
              </div>
            )}

            {pedidos && pedidos.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {pedidos.map((pedido) => (
                  <li key={pedido.id} className="px-3 py-2.5">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-neutro-500">
                        {new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium text-berinjela">
                          R$ {Number(pedido.valor_total).toFixed(2)}
                        </span>
                        <Badge tone={STATUS_TONE[pedido.status]}>
                          {STATUS_LABEL[pedido.status]}
                        </Badge>
                      </div>
                    </div>
                    <p className="truncate text-sm text-neutro-700">
                      {pedido.pedido_itens
                        .map((item) => `${item.quantidade}x ${item.produtos?.nome ?? "—"}`)
                        .join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
