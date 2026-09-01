"use client";

import { Phone, MapPin, Calendar, PackageCheck, ArrowRight } from "lucide-react";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { formatarTelefone } from "@/lib/telefone";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";
import type { PedidoStatus, EncomendaDestinoSobra } from "@/lib/types/database";

type Item = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  produtos: { nome: string } | null;
};

type AcertoItem = {
  produto_id: string;
  qtd_entregue: number;
  qtd_sobra: number;
  destino_sobra: EncomendaDestinoSobra;
  preco_unitario: number;
  produtos: { nome: string } | null;
};

type Acerto = {
  valor_recebido: number;
  data: string;
  observacoes: string | null;
  encomenda_acerto_itens: AcertoItem[];
};

export type EncomendaDetalhe = {
  id: string;
  status: PedidoStatus;
  valor_total: number;
  observacoes: string | null;
  data_pedido: string;
  data_entrega_prevista: string | null;
  clientes: { nome: string; telefone: string; endereco: string | null } | null;
  pedido_itens: Item[];
  acerto: Acerto | null;
};

function reais(valor: number) {
  return `R$ ${Number(valor).toFixed(2)}`;
}

function formatarDataLonga(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function EncomendaDetalheModal({
  encomenda,
  onClose,
}: {
  encomenda: EncomendaDetalhe | null;
  onClose: () => void;
}) {
  const totalEntregue = encomenda?.pedido_itens.reduce(
    (s, i) => s + i.quantidade,
    0
  );

  return (
    <Modal
      open={!!encomenda}
      onClose={onClose}
      title={encomenda?.clientes?.nome ?? "Encomenda"}
      description={
        encomenda
          ? `Pedido em ${formatarDataLonga(encomenda.data_pedido)}`
          : undefined
      }
    >
      {encomenda && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[encomenda.status]}>
              {STATUS_LABEL[encomenda.status]}
            </Badge>
            {encomenda.data_entrega_prevista && (
              <span className="flex items-center gap-1 text-xs text-neutro-500">
                <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                entrega combinada: {formatarDataLonga(encomenda.data_entrega_prevista)}
              </span>
            )}
          </div>

          <div className="rounded-lg bg-berinjela-50 p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutro-500">
              Cliente
            </p>
            <p className="mb-1 text-sm font-medium text-berinjela">
              {encomenda.clientes?.nome ?? "—"}
            </p>
            {encomenda.clientes?.telefone && (
              <p className="mb-1 flex items-center gap-1.5 text-sm text-neutro-700">
                <Phone className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
                {formatarTelefone(encomenda.clientes.telefone)}
              </p>
            )}
            {encomenda.clientes?.endereco && (
              <p className="flex items-center gap-1.5 text-sm text-neutro-700">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-neutro-400" strokeWidth={1.75} />
                {encomenda.clientes.endereco}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutro-500">
              Itens entregues ({totalEntregue})
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {encomenda.pedido_itens.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="text-berinjela">
                    {item.quantidade}x {item.produtos?.nome ?? "—"}
                  </span>
                  <span className="text-neutro-500">
                    {reais(item.quantidade * item.preco_unitario)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {encomenda.observacoes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutro-500">
                Observações
              </p>
              <p className="text-sm text-neutro-700">{encomenda.observacoes}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-berinjela">
              Valor entregue
            </span>
            <span className="text-base font-semibold text-berinjela">
              {reais(encomenda.valor_total)}
            </span>
          </div>

          {encomenda.acerto ? (
            <div className="rounded-lg border border-salvia/30 bg-salvia-bg p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4 shrink-0 text-salvia-text" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wide text-salvia-text">
                  Acerto de {formatarDataLonga(encomenda.acerto.data)}
                </p>
              </div>

              <ul className="mb-3 space-y-1.5">
                {encomenda.acerto.encomenda_acerto_itens.map((item, i) => {
                  const vendido = item.qtd_entregue - item.qtd_sobra;
                  return (
                    <li key={i} className="text-sm text-berinjela">
                      <div className="flex items-center justify-between">
                        <span>{item.produtos?.nome ?? "—"}</span>
                        <span className="text-neutro-600">
                          {vendido}x vendido
                        </span>
                      </div>
                      {item.qtd_sobra > 0 && (
                        <p className="text-xs text-neutro-500">
                          {item.qtd_sobra} sobrou —{" "}
                          {item.destino_sobra === "estoque"
                            ? "voltou pro estoque"
                            : "virou perda"}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {encomenda.acerto.observacoes && (
                <p className="mb-3 text-xs text-neutro-600">
                  {encomenda.acerto.observacoes}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-salvia/20 pt-2">
                <span className="flex items-center gap-1 text-sm font-medium text-salvia-text">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  Recebido
                </span>
                <span className="text-base font-semibold text-salvia-text">
                  {reais(encomenda.acerto.valor_recebido)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutro-500">
              Ainda sem acerto — o valor acima é o potencial, não o que foi
              recebido de fato.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
