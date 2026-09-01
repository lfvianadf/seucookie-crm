"use client";

import { useState, useTransition } from "react";
import { MapPin, Calendar, Receipt, Package } from "lucide-react";
import { atualizarStatusPedido, excluirPedido } from "@/lib/actions/pedidos";
import { useToast } from "@/components/ui/toast";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AcertoModal } from "@/components/acerto-modal";
import { EncomendaDetalheModal } from "@/components/encomenda-detalhe-modal";
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
  temAcertoRegistrado,
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

type AcertoBruto = {
  id: string;
  valor_recebido: number;
  data: string;
  observacoes: string | null;
  encomenda_acerto_itens: {
    produto_id: string;
    qtd_entregue: number;
    qtd_sobra: number;
    destino_sobra: "estoque" | "perda";
    preco_unitario: number;
    produtos: { nome: string } | null;
  }[];
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
  // pode vir objeto, array vazio/cheio ou null a depender do schema cache
  // do PostgREST — normalizado por temAcertoRegistrado/primeiroAcerto,
  // nunca lido cru
  encomenda_acertos: AcertoBruto | AcertoBruto[] | null;
};

/** Mesma normalização de temAcertoRegistrado, mas devolvendo o objeto. */
function primeiroAcerto(valor: Encomenda["encomenda_acertos"]) {
  if (!valor) return null;
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor;
}

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

  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();

  const selecionada = encomendas.find((e) => e.id === selecionadaId) ?? null;

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
      temAcerto: temAcertoRegistrado(e.encomenda_acertos),
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

  const acertoSelecionado = selecionada ? primeiroAcerto(selecionada.encomenda_acertos) : null;

  return (
    <div className="space-y-6">
      <Secao
        titulo="Precisa de ação"
        encomendas={pendentes}
        moverStatus={moverStatus}
        remover={remover}
        selecionar={setSelecionadaId}
      />
      <Secao
        titulo="Agendadas"
        encomendas={agendadas}
        moverStatus={moverStatus}
        remover={remover}
        selecionar={setSelecionadaId}
      />
      <Secao
        titulo="Outras"
        encomendas={outras}
        moverStatus={moverStatus}
        remover={remover}
        selecionar={setSelecionadaId}
      />

      <EncomendaDetalheModal
        encomenda={
          selecionada
            ? {
                id: selecionada.id,
                status: selecionada.status,
                valor_total: selecionada.valor_total,
                observacoes: selecionada.observacoes,
                data_pedido: selecionada.data_pedido,
                data_entrega_prevista: selecionada.data_entrega_prevista,
                clientes: selecionada.clientes,
                pedido_itens: selecionada.pedido_itens,
                acerto: acertoSelecionado
                  ? {
                      valor_recebido: acertoSelecionado.valor_recebido,
                      data: acertoSelecionado.data,
                      observacoes: acertoSelecionado.observacoes,
                      encomenda_acerto_itens: acertoSelecionado.encomenda_acerto_itens,
                    }
                  : null,
              }
            : null
        }
        onClose={() => setSelecionadaId(null)}
      />
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
  selecionar,
}: {
  titulo: string;
  encomendas: EncomendaComSituacao[];
  moverStatus: (id: string, status: PedidoStatus) => void;
  remover: (id: string) => Promise<void>;
  selecionar: (id: string) => void;
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
              <li
                key={encomenda.id}
                onClick={() => selecionar(encomenda.id)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-berinjela-50/60"
              >
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
                  onClick={(e) => e.stopPropagation()}
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
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <AcertoModal
                      pedidoId={encomenda.id}
                      clienteNome={encomenda.clientes?.nome ?? "cliente"}
                      itens={encomenda.pedido_itens}
                      trigger={
                        <Button size="sm">
                          <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Acerto
                        </Button>
                      }
                    />
                  </div>
                )}

                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <ConfirmDeleteButton
                    itemName={`a encomenda de ${encomenda.clientes?.nome ?? "cliente"}`}
                    onConfirm={() => remover(encomenda.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
