"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarStatusPedido } from "@/lib/actions/pedidos";
import { useToast } from "@/components/ui/toast";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  STATUS_ORDEM,
  STATUS_LABEL,
  STATUS_TONE,
  STATUS_COLUNA_ACCENT,
} from "@/lib/pedido-status";
import type { PedidoStatus } from "@/lib/types/database";

type Pedido = {
  id: string;
  status: PedidoStatus;
  origem: string;
  valor_total: number;
  observacoes: string | null;
  data_pedido: string;
  clientes: { nome: string; telefone: string } | null;
};

const TONE_SELECT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-berinjela-50 text-neutro-700",
  salvia: "bg-salvia-bg text-salvia-text",
  atencao: "bg-atencao-bg text-atencao-text",
  erro: "bg-erro-bg text-erro-text",
};

export function PedidosKanban({ pedidosIniciais }: { pedidosIniciais: Pedido[] }) {
  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<PedidoStatus | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function moverPedido(id: string, status: PedidoStatus) {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    startTransition(() => {
      atualizarStatusPedido(id, status).then(() => {
        toast(`Pedido movido para "${STATUS_LABEL[status]}"`);
        router.refresh();
      });
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDEM.map((status) => {
        const itens = pedidos.filter((p) => p.status === status);
        const isAlvo = colunaAlvo === status;

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setColunaAlvo(status);
            }}
            onDragLeave={() => setColunaAlvo((atual) => (atual === status ? null : atual))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) moverPedido(id, status);
              setArrastando(null);
              setColunaAlvo(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl border-t-2 bg-berinjela-50/50 transition-shadow duration-150 ${STATUS_COLUNA_ACCENT[status]} ${
              isAlvo ? "shadow-[0_0_0_2px_var(--rosa)]" : ""
            }`}
          >
            <div className="flex items-center justify-between px-3 py-3">
              <h2 className="text-sm font-semibold text-berinjela">
                {STATUS_LABEL[status]}
              </h2>
              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-neutro-500">
                {itens.length}
              </span>
            </div>

            <div className="flex min-h-16 flex-1 flex-col gap-2 px-2 pb-2">
              {itens.map((pedido) => (
                <div
                  key={pedido.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", pedido.id);
                    setArrastando(pedido.id);
                  }}
                  onDragEnd={() => setArrastando(null)}
                  className={`cursor-grab rounded-lg border border-border bg-white p-3 shadow-sm transition-all duration-150 ease-out hover:shadow-md active:cursor-grabbing ${
                    arrastando === pedido.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-berinjela">
                      {pedido.clientes?.nome ?? "—"}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-berinjela">
                      R$ {Number(pedido.valor_total).toFixed(2)}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-neutro-500">
                    {pedido.clientes?.telefone ?? "—"} ·{" "}
                    {new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}
                  </p>
                  {pedido.observacoes && (
                    <p className="mb-2 truncate text-xs text-neutro-500">
                      {pedido.observacoes}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="neutral" className="uppercase tracking-wide">
                      {pedido.origem}
                    </Badge>
                    <select
                      value={pedido.status}
                      onChange={(e) =>
                        moverPedido(pedido.id, e.target.value as PedidoStatus)
                      }
                      className={`cursor-pointer rounded-md border-0 px-2 py-1 text-xs font-medium outline-none transition-colors duration-150 ${TONE_SELECT_CLASSES[STATUS_TONE[pedido.status]]}`}
                    >
                      {STATUS_ORDEM.map((value) => (
                        <option key={value} value={value}>
                          {STATUS_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {!itens.length && (
                <p className="px-2 py-6 text-center text-xs text-neutro-400">
                  Nenhum pedido
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
