"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { atualizarStatusPedido } from "@/lib/actions/pedidos";
import { useToast } from "@/components/ui/toast";
import { PedidoDetalheModal } from "@/components/pedido-detalhe-modal";
import {
  STATUS_ORDEM,
  STATUS_LABEL,
  STATUS_COLUNA_ACCENT,
} from "@/lib/pedido-status";
import type { PedidoStatus, TipoProduto } from "@/lib/types/database";

type Item = {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  produtos: { nome: string; tipo_produto: TipoProduto } | null;
  pedido_item_composicao: {
    quantidade: number;
    produtos: { nome: string } | null;
  }[];
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

type Produto = { id: string; nome: string; preco: number; tipo_produto: TipoProduto };

export function PedidosKanban({
  pedidosIniciais,
  produtos,
}: {
  pedidosIniciais: Pedido[];
  produtos: Produto[];
}) {
  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<PedidoStatus | null>(null);
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState<string | null>(null);
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

  const pedidoSelecionado = pedidos.find((p) => p.id === pedidoSelecionadoId) ?? null;

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
              {itens.map((pedido) => {
                const resumoItens = pedido.pedido_itens
                  .map((item) => {
                    const base = `${item.quantidade}x ${item.produtos?.nome ?? "—"}`;
                    if (!item.pedido_item_composicao.length) return base;
                    const composicao = item.pedido_item_composicao
                      .map((c) => `${c.quantidade}x ${c.produtos?.nome ?? "—"}`)
                      .join(", ");
                    return `${base} (${composicao})`;
                  })
                  .join(", ");

                return (
                  <div
                    key={pedido.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", pedido.id);
                      setArrastando(pedido.id);
                    }}
                    onDragEnd={() => setArrastando(null)}
                    onClick={() => setPedidoSelecionadoId(pedido.id)}
                    className={`cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm transition-all duration-150 ease-out hover:shadow-md active:cursor-grabbing ${
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
                    {resumoItens && (
                      <p className="mb-1 text-xs text-neutro-600">{resumoItens}</p>
                    )}
                    {pedido.clientes?.endereco && (
                      <p className="flex items-center gap-1 text-xs text-neutro-500">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{pedido.clientes.endereco}</span>
                      </p>
                    )}
                  </div>
                );
              })}
              {!itens.length && (
                <p className="px-2 py-6 text-center text-xs text-neutro-400">
                  Nenhum pedido
                </p>
              )}
            </div>
          </div>
        );
      })}

      <PedidoDetalheModal
        pedido={pedidoSelecionado}
        produtos={produtos}
        onStatusChange={moverPedido}
        onClose={() => setPedidoSelecionadoId(null)}
        onDeleted={(id) => {
          setPedidos((prev) => prev.filter((p) => p.id !== id));
          setPedidoSelecionadoId(null);
        }}
        onUpdated={(pedidoAtualizado) => {
          setPedidos((prev) =>
            prev.map((p) => (p.id === pedidoAtualizado.id ? pedidoAtualizado : p))
          );
        }}
      />
    </div>
  );
}
