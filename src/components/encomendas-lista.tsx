"use client";

import { useState, useTransition } from "react";
import { MapPin, Calendar, Receipt, Package } from "lucide-react";
import { atualizarStatusPedido, excluirPedido } from "@/lib/actions/pedidos";
import { useToast } from "@/components/ui/toast";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AcertoModal } from "@/components/acerto-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  STATUS_ORDEM,
  STATUS_LABEL,
  STATUS_TONE,
  STATUS_SELECT_CLASSES,
} from "@/lib/pedido-status";
import {
  situacaoEncomenda,
  SITUACAO_ENCOMENDA_LABEL,
  SITUACAO_ENCOMENDA_TONE,
} from "@/lib/encomenda";
import type { PedidoStatus } from "@/lib/types/database";

type Item = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  produtos: { nome: string } | null;
};

type Encomenda = {
  id: string;
  status: PedidoStatus;
  valor_total: number;
  observacoes: string | null;
  data_pedido: string;
  data_entrega_prevista: string | null;
  clientes: { nome: string; telefone: string; endereco: string | null } | null;
  pedido_itens: Item[];
  /** null quando não há acerto — relação 1:1 (índice único em pedido_id) */
  encomenda_acertos: { id: string } | null;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function EncomendasLista({
  encomendasIniciais,
}: {
  encomendasIniciais: Encomenda[];
}) {
  const [encomendas, setEncomendas] = useState(encomendasIniciais);

  // mesmo padrão do Kanban de varejo: cópia local sincroniza quando o
  // servidor manda dado novo, sem ignorar revalidação de outra aba/ação
  const [listaDoServidor, setListaDoServidor] = useState(encomendasIniciais);
  if (encomendasIniciais !== listaDoServidor) {
    setListaDoServidor(encomendasIniciais);
    setEncomendas(encomendasIniciais);
  }

  const [, startTransition] = useTransition();
  const toast = useToast();

  function moverStatus(id: string, status: PedidoStatus) {
    setEncomendas((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    startTransition(() => {
      atualizarStatusPedido(id, status).then(() => {
        toast(`Encomenda movida para "${STATUS_LABEL[status]}"`);
      });
    });
  }

  function remover(id: string) {
    return excluirPedido(id).then(() => {
      setEncomendas((prev) => prev.filter((e) => e.id !== id));
    });
  }

  if (encomendas.length === 0) {
    return <EmptyState icon={Package} title="Nenhuma encomenda ainda." />;
  }

  const comAcertoTodo = encomendas.map((e) => ({
    ...e,
    situacao: situacaoEncomenda({
      status: e.status,
      data_entrega_prevista: e.data_entrega_prevista,
      temAcerto: !!e.encomenda_acertos,
    }),
  }));

  // "precisa de ação" primeiro, mais antiga primeiro — é o que exige clique
  const pendentes = comAcertoTodo
    .filter((e) => e.situacao === "entregue_pendente")
    .sort((a, b) => a.data_pedido.localeCompare(b.data_pedido));

  const agendadas = comAcertoTodo
    .filter((e) => e.situacao === "agendada" || e.situacao === "atrasada")
    .sort((a, b) =>
      (a.data_entrega_prevista ?? "").localeCompare(b.data_entrega_prevista ?? "")
    );

  const outras = comAcertoTodo.filter(
    (e) => e.situacao !== "entregue_pendente" && e.situacao !== "agendada" && e.situacao !== "atrasada"
  );

  return (
    <div className="space-y-6">
      <Secao titulo="Precisa de ação" encomendas={pendentes} moverStatus={moverStatus} remover={remover} />
      <Secao titulo="Agendadas" encomendas={agendadas} moverStatus={moverStatus} remover={remover} />
      <Secao titulo="Outras" encomendas={outras} moverStatus={moverStatus} remover={remover} />
    </div>
  );
}

type EncomendaComSituacao = Encomenda & {
  situacao: ReturnType<typeof situacaoEncomenda>;
};

function Secao({
  titulo,
  encomendas,
  moverStatus,
  remover,
}: {
  titulo: string;
  encomendas: EncomendaComSituacao[];
  moverStatus: (id: string, status: PedidoStatus) => void;
  remover: (id: string) => Promise<void>;
}) {
  if (encomendas.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-berinjela">{titulo}</h2>
        <span className="text-xs text-neutro-500">{encomendas.length}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <ul className="divide-y divide-border">
          {encomendas.map((encomenda) => {
            const resumoItens = encomenda.pedido_itens
              .map((item) => `${item.quantidade}x ${item.produtos?.nome ?? "—"}`)
              .join(", ");

            return (
              <li key={encomenda.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-berinjela">
                      {encomenda.clientes?.nome ?? "—"}
                    </p>
                    <Badge tone={SITUACAO_ENCOMENDA_TONE[encomenda.situacao]}>
                      {SITUACAO_ENCOMENDA_LABEL[encomenda.situacao]}
                    </Badge>
                  </div>
                  {resumoItens && (
                    <p className="truncate text-xs text-neutro-600">{resumoItens}</p>
                  )}
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-neutro-500">
                    {encomenda.data_entrega_prevista && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                        {formatarData(encomenda.data_entrega_prevista)}
                      </span>
                    )}
                    {encomenda.clientes?.endereco && (
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{encomenda.clientes.endereco}</span>
                      </span>
                    )}
                  </div>
                </div>

                <span className="shrink-0 text-sm font-semibold text-berinjela">
                  R$ {Number(encomenda.valor_total).toFixed(2)}
                </span>

                <select
                  value={encomenda.status}
                  onChange={(e) => moverStatus(encomenda.id, e.target.value as PedidoStatus)}
                  className={`shrink-0 cursor-pointer rounded-md border-0 px-2 py-1 text-xs font-medium outline-none transition-colors duration-150 ${STATUS_SELECT_CLASSES[STATUS_TONE[encomenda.status]]}`}
                >
                  {STATUS_ORDEM.filter((s) => s !== "cancelado").map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABEL[value]}
                    </option>
                  ))}
                </select>

                {encomenda.situacao === "entregue_pendente" && (
                  <AcertoModal
                    pedidoId={encomenda.id}
                    clienteNome={encomenda.clientes?.nome ?? "cliente"}
                    itens={encomenda.pedido_itens}
                    trigger={
                      <Button size="sm" className="shrink-0">
                        <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Acerto
                      </Button>
                    }
                  />
                )}

                <ConfirmDeleteButton
                  itemName={`a encomenda de ${encomenda.clientes?.nome ?? "cliente"}`}
                  onConfirm={() => remover(encomenda.id)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
