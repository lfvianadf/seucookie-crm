"use client";

import { useState, useTransition } from "react";
import {
  Phone,
  MapPin,
  Calendar,
  PackageCheck,
  ArrowRight,
  Pencil,
  X,
  AlertCircle,
} from "lucide-react";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { atualizarPedido } from "@/lib/actions/pedidos";
import { formatarTelefone } from "@/lib/telefone";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";
import type {
  PedidoStatus,
  EncomendaDestinoSobra,
  TipoProduto,
} from "@/lib/types/database";

type Item = {
  id: string;
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

type Produto = { id: string; nome: string; preco: number; tipo_produto: TipoProduto };

// key local estável em vez do id do banco — itens novos (ainda não salvos)
// não têm id, mesmo padrão de PedidoDetalheModal
type ItemEdicao = Omit<Item, "id"> & { id?: string; key: string };

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
  produtos,
  onClose,
  onUpdated,
}: {
  encomenda: EncomendaDetalhe | null;
  produtos: Produto[];
  onClose: () => void;
  onUpdated: (encomenda: EncomendaDetalhe) => void;
}) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [itensEdicao, setItensEdicao] = useState<ItemEdicao[]>([]);
  const [observacoesEdicao, setObservacoesEdicao] = useState("");
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const totalEntregue = encomenda?.pedido_itens.reduce(
    (s, i) => s + i.quantidade,
    0
  );

  function iniciarEdicao() {
    if (!encomenda) return;
    setItensEdicao(encomenda.pedido_itens.map((i) => ({ ...i, key: i.id })));
    setObservacoesEdicao(encomenda.observacoes ?? "");
    setErro(null);
    setModoEdicao(true);
  }

  function cancelarEdicao() {
    setModoEdicao(false);
    setErro(null);
  }

  function alterarQuantidade(key: string, quantidade: number) {
    setItensEdicao((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantidade } : i))
    );
  }

  function removerItem(key: string) {
    setItensEdicao((prev) => prev.filter((i) => i.key !== key));
  }

  function adicionarItem() {
    if (!produtoParaAdicionar) return;
    const produto = produtos.find((p) => p.id === produtoParaAdicionar);
    if (!produto) return;
    if (itensEdicao.some((i) => i.produto_id === produto.id)) {
      setProdutoParaAdicionar("");
      return;
    }
    setItensEdicao((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        produto_id: produto.id,
        quantidade: 1,
        preco_unitario: produto.preco,
        produtos: { nome: produto.nome },
      },
    ]);
    setProdutoParaAdicionar("");
  }

  function salvarEdicao() {
    if (!encomenda) return;
    setErro(null);

    if (itensEdicao.length === 0) {
      setErro("A encomenda precisa de ao menos um item.");
      return;
    }
    if (itensEdicao.some((i) => !i.quantidade || i.quantidade <= 0)) {
      setErro("Quantidade inválida em algum item.");
      return;
    }

    startTransition(async () => {
      try {
        await atualizarPedido({
          pedidoId: encomenda.id,
          itens: itensEdicao.map((i) => ({
            id: i.id,
            produto_id: i.produto_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
          })),
          observacoes: observacoesEdicao.trim() || undefined,
        });

        const novoValorTotal = itensEdicao.reduce(
          (soma, i) => soma + i.quantidade * i.preco_unitario,
          0
        );
        onUpdated({
          ...encomenda,
          pedido_itens: itensEdicao.map((i) => ({
            id: i.id ?? i.key,
            produto_id: i.produto_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            produtos: i.produtos,
          })),
          observacoes: observacoesEdicao.trim() || null,
          valor_total: novoValorTotal,
        });
        toast("Encomenda atualizada, estoque ajustado");
        setModoEdicao(false);
      } catch {
        setErro("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <Modal
      open={!!encomenda}
      onClose={() => {
        setModoEdicao(false);
        onClose();
      }}
      title={encomenda?.clientes?.nome ?? "Encomenda"}
      description={
        encomenda
          ? `Pedido em ${formatarDataLonga(encomenda.data_pedido)}`
          : undefined
      }
    >
      {encomenda && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
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

            {!modoEdicao && !encomenda.acerto && (
              <IconButton aria-label="Editar encomenda" title="Editar" onClick={iniciarEdicao}>
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </IconButton>
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
              {modoEdicao ? "Itens" : `Itens entregues (${totalEntregue})`}
            </p>

            {!modoEdicao ? (
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
            ) : (
              <div className="space-y-2">
                {itensEdicao.length > 0 && (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {itensEdicao.map((item) => (
                      <li key={item.key} className="px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-berinjela">
                            {item.produtos?.nome ?? "—"}
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantidade}
                            onChange={(e) =>
                              alterarQuantidade(item.key, Number(e.target.value))
                            }
                            className="w-20 rounded-md border border-border-strong px-2 py-1 text-sm outline-none focus:border-rosa"
                          />
                          <button
                            type="button"
                            onClick={() => removerItem(item.key)}
                            aria-label={`Remover ${item.produtos?.nome}`}
                            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutro-400 transition-colors duration-150 hover:bg-erro-bg hover:text-erro"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Select
                    value={produtoParaAdicionar}
                    onChange={(e) => setProdutoParaAdicionar(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Adicionar produto...</option>
                    {produtos
                      .filter(
                        (p) => !itensEdicao.some((i) => i.produto_id === p.id)
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} · R$ {p.preco.toFixed(2)}
                        </option>
                      ))}
                  </Select>
                  <Button type="button" variant="secondary" onClick={adicionarItem}>
                    Adicionar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!modoEdicao ? (
            encomenda.observacoes && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutro-500">
                  Observações
                </p>
                <p className="text-sm text-neutro-700">{encomenda.observacoes}</p>
              </div>
            )
          ) : (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutro-500">
                Observações
              </p>
              <Textarea
                value={observacoesEdicao}
                onChange={(e) => setObservacoesEdicao(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 rounded-lg bg-erro-bg px-3 py-2.5 text-sm text-erro-text">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {erro}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-berinjela">
              Valor entregue
            </span>
            <span className="text-base font-semibold text-berinjela">
              {reais(
                modoEdicao
                  ? itensEdicao.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0)
                  : encomenda.valor_total
              )}
            </span>
          </div>

          {modoEdicao && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={cancelarEdicao}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={salvarEdicao} loading={isPending}>
                Salvar alterações
              </Button>
            </div>
          )}

          {!modoEdicao && encomenda.acerto ? (
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
            !modoEdicao && (
              <p className="text-xs text-neutro-500">
                Ainda sem acerto — o valor acima é o potencial, não o que foi
                recebido de fato.
              </p>
            )
          )}
        </div>
      )}
    </Modal>
  );
}
