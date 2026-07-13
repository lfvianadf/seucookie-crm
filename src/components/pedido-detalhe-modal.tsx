"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, MapPin, Pencil, X, AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { atualizarPedido, excluirPedido } from "@/lib/actions/pedidos";
import {
  STATUS_ORDEM,
  STATUS_LABEL,
  STATUS_TONE,
  STATUS_SELECT_CLASSES,
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

// itens em edição usam uma "key" local estável em vez do id do banco, porque
// itens novos (ainda não salvos) não têm id — a key também serve pra evitar
// colisão de React key quando duas boxes iguais existem no mesmo pedido.
type ItemEdicao = Omit<Item, "id"> & { id?: string; key: string };

export function PedidoDetalheModal({
  pedido,
  produtos,
  onClose,
  onStatusChange,
  onDeleted,
  onUpdated,
}: {
  pedido: Pedido | null;
  produtos: Produto[];
  onClose: () => void;
  onStatusChange: (id: string, status: PedidoStatus) => void;
  onDeleted: (id: string) => void;
  onUpdated: (pedido: Pedido) => void;
}) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [itensEdicao, setItensEdicao] = useState<ItemEdicao[]>([]);
  const [observacoesEdicao, setObservacoesEdicao] = useState("");
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function iniciarEdicao() {
    if (!pedido) return;
    setItensEdicao(
      pedido.pedido_itens.map((i) => ({ ...i, key: i.id }))
    );
    setObservacoesEdicao(pedido.observacoes ?? "");
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
    if (
      itensEdicao.some(
        (i) => i.produto_id === produto.id && !i.pedido_item_composicao.length
      )
    ) {
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
        produtos: { nome: produto.nome, tipo_produto: produto.tipo_produto },
        pedido_item_composicao: [],
      },
    ]);
    setProdutoParaAdicionar("");
  }

  function salvarEdicao() {
    if (!pedido) return;
    setErro(null);

    if (itensEdicao.length === 0) {
      setErro("O pedido precisa de ao menos um item.");
      return;
    }
    if (itensEdicao.some((i) => !i.quantidade || i.quantidade <= 0)) {
      setErro("Quantidade inválida em algum item.");
      return;
    }

    startTransition(async () => {
      try {
        await atualizarPedido({
          pedidoId: pedido.id,
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
          ...pedido,
          pedido_itens: itensEdicao.map((i) => ({
            id: i.id ?? i.key,
            produto_id: i.produto_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            produtos: i.produtos,
            pedido_item_composicao: i.pedido_item_composicao,
          })),
          observacoes: observacoesEdicao.trim() || null,
          valor_total: novoValorTotal,
        });
        toast("Pedido atualizado, estoque ajustado");
        setModoEdicao(false);
        router.refresh();
      } catch {
        setErro("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <Modal
      open={!!pedido}
      onClose={() => {
        setModoEdicao(false);
        onClose();
      }}
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <select
                value={pedido.status}
                onChange={(e) =>
                  onStatusChange(pedido.id, e.target.value as PedidoStatus)
                }
                className={`cursor-pointer rounded-md border-0 px-2.5 py-1 text-xs font-medium outline-none transition-colors duration-150 ${STATUS_SELECT_CLASSES[STATUS_TONE[pedido.status]]}`}
              >
                {STATUS_ORDEM.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
              <Badge tone="neutral" className="uppercase tracking-wide">
                {pedido.origem}
              </Badge>
            </div>

            {!modoEdicao && (
              <div className="flex items-center gap-1">
                <IconButton aria-label="Editar pedido" title="Editar" onClick={iniciarEdicao}>
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                </IconButton>
                <ConfirmDeleteButton
                  itemName={`o pedido de ${pedido.clientes?.nome ?? "cliente"}`}
                  onConfirm={async () => {
                    await excluirPedido(pedido.id);
                    onDeleted(pedido.id);
                  }}
                />
              </div>
            )}
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

            {!modoEdicao ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {pedido.pedido_itens.map((item) => (
                  <li key={item.id} className="px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-berinjela">
                        {item.quantidade}x {item.produtos?.nome ?? "—"}
                      </span>
                      <span className="text-neutro-500">
                        R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                      </span>
                    </div>
                    {item.pedido_item_composicao.length > 0 && (
                      <p className="mt-0.5 text-xs text-neutro-500">
                        {item.pedido_item_composicao
                          .map((c) => `${c.quantidade}x ${c.produtos?.nome ?? "—"}`)
                          .join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                {itensEdicao.length > 0 && (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {itensEdicao.map((item) => {
                      const ehBox = item.pedido_item_composicao.length > 0;
                      return (
                        <li key={item.key} className="px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 truncate text-berinjela">
                              {item.produtos?.nome ?? "—"}
                            </span>
                            {ehBox ? (
                              <span className="text-neutro-500">{item.quantidade}x</span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={item.quantidade}
                                onChange={(e) =>
                                  alterarQuantidade(item.key, Number(e.target.value))
                                }
                                className="w-16 rounded-md border border-border-strong px-2 py-1 text-sm outline-none focus:border-rosa"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removerItem(item.key)}
                              aria-label={`Remover ${item.produtos?.nome}`}
                              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutro-400 transition-colors duration-150 hover:bg-erro-bg hover:text-erro"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                          {ehBox && (
                            <p className="mt-0.5 text-xs text-neutro-500">
                              {item.pedido_item_composicao
                                .map((c) => `${c.quantidade}x ${c.produtos?.nome ?? "—"}`)
                                .join(", ")}{" "}
                              · composição não editável, só remover ou trocar de item
                            </p>
                          )}
                        </li>
                      );
                    })}
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
                      .filter((p) => p.tipo_produto === "cookie")
                      .filter(
                        (p) =>
                          !itensEdicao.some(
                            (i) =>
                              i.produto_id === p.id && !i.pedido_item_composicao.length
                          )
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
            pedido.observacoes && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutro-500">
                  Observações
                </p>
                <p className="text-sm text-neutro-700">{pedido.observacoes}</p>
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
            <span className="text-sm font-medium text-berinjela">Total</span>
            <span className="text-base font-semibold text-berinjela">
              R${" "}
              {(modoEdicao
                ? itensEdicao.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0)
                : Number(pedido.valor_total)
              ).toFixed(2)}
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
        </div>
      )}
    </Modal>
  );
}
