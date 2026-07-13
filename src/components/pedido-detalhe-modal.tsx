"use client";

import { Phone, MapPin } from "lucide-react";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";
import type { PedidoStatus } from "@/lib/types/database";

type Item = {
  quantidade: number;
  preco_unitario: number;
  produtos: { nome: string } | null;
};

type Pedido = {
  id: string;
  status: PedidoStatus;
  origem: string;
  valor_total: number;
  observacoes: string | null;
  data_pedido: string;
  clientes: { nome: string; telefone: string; endereco: string | null } | null;
  pedido_itens: Item[];
};

export function PedidoDetalheModal({
  pedido,
  onClose,
}: {
  pedido: Pedido | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!pedido}
      onClose={onClose}
      title={pedido?.clientes?.nome ?? "Pedido"}
      description={
        pedido
          ? new Date(pedido.data_pedido).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : undefined
      }
    >
      {pedido && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[pedido.status]}>
              {STATUS_LABEL[pedido.status]}
            </Badge>
            <Badge tone="neutral" className="uppercase tracking-wide">
              {pedido.origem}
            </Badge>
          </div>

          <div className="rounded-lg bg-berinjela-50 p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutro-500">
              Cliente
            </p>
            <p className="mb-1 text-sm font-medium text-berinjela">
              {pedido.clientes?.nome ?? "—"}
            </p>
            {pedido.clientes?.telefone && (
              <p className="mb-1 flex items-center gap-1.5 text-sm text-neutro-700">
                <Phone className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
                {pedido.clientes.telefone}
              </p>
            )}
            {pedido.clientes?.endereco && (
              <p className="flex items-center gap-1.5 text-sm text-neutro-700">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
                {pedido.clientes.endereco}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutro-500">
              Itens
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {pedido.pedido_itens.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="text-berinjela">
                    {item.quantidade}x {item.produtos?.nome ?? "—"}
                  </span>
                  <span className="text-neutro-500">
                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {pedido.observacoes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutro-500">
                Observações
              </p>
              <p className="text-sm text-neutro-700">{pedido.observacoes}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-berinjela">Total</span>
            <span className="text-base font-semibold text-berinjela">
              R$ {Number(pedido.valor_total).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}
