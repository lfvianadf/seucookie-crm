"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, Textarea, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registrarAcerto, type SobraAcerto } from "@/lib/actions/encomendas";
import type { EncomendaDestinoSobra } from "@/lib/types/database";

type ItemEncomenda = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  produtos: { nome: string } | null;
};

export function AcertoModal({
  pedidoId,
  clienteNome,
  itens,
  trigger,
}: {
  pedidoId: string;
  clienteNome: string;
  itens: ItemEncomenda[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  // uma linha por item entregue; a sobra nasce em 0 — "vendeu tudo" fecha
  // em dois toques (princípio 1 do doc: cadastro rápido)
  const [sobras, setSobras] = useState<Record<string, string>>({});
  const [destinos, setDestinos] = useState<Record<string, EncomendaDestinoSobra>>(
    {}
  );

  const valorSugerido = itens.reduce((soma, item) => {
    const sobra = Number(sobras[item.produto_id] ?? 0) || 0;
    const vendido = Math.max(item.quantidade - sobra, 0);
    return soma + vendido * item.preco_unitario;
  }, 0);

  const [valorRecebido, setValorRecebido] = useState<string | null>(null);
  const valorExibido = valorRecebido ?? valorSugerido.toFixed(2);
  const [observacoes, setObservacoes] = useState("");

  function alterarSobra(produtoId: string, valor: string) {
    setSobras((prev) => ({ ...prev, [produtoId]: valor }));
  }

  function alterarDestino(produtoId: string, destino: EncomendaDestinoSobra) {
    setDestinos((prev) => ({ ...prev, [produtoId]: destino }));
  }

  function handleSubmit() {
    setErro(null);

    const payload: SobraAcerto[] = itens.map((item) => {
      const qtdSobra = Number(sobras[item.produto_id] ?? 0) || 0;
      return {
        produtoId: item.produto_id,
        qtdEntregue: item.quantidade,
        qtdSobra,
        destino: destinos[item.produto_id] ?? "estoque",
        precoUnitario: item.preco_unitario,
      };
    });

    const invalido = payload.find((p) => p.qtdSobra > p.qtdEntregue);
    if (invalido) {
      setErro("A sobra não pode ser maior do que o que foi entregue.");
      return;
    }

    const valor = Number(valorExibido);
    if (Number.isNaN(valor) || valor < 0) {
      setErro("Valor recebido inválido.");
      return;
    }

    startTransition(async () => {
      try {
        await registrarAcerto({
          pedidoId,
          sobras: payload,
          valorRecebido: valor,
          observacoes: observacoes.trim() || undefined,
        });
        setOpen(false);
        toast("Acerto registrado");
      } catch (e) {
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível registrar o acerto."
        );
      }
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Acerto — ${clienteNome}`}
        description="Quanto sobrou de cada sabor, e quanto você recebeu de fato."
        maxWidth="max-w-lg"
      >
        <FieldGroup className="mb-6">
          <div className="space-y-3">
            {itens.map((item) => {
              const sobra = Number(sobras[item.produto_id] ?? 0) || 0;
              const destino = destinos[item.produto_id] ?? "estoque";
              return (
                <div
                  key={item.produto_id}
                  className="rounded-lg border border-border-strong p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-berinjela">
                      {item.produtos?.nome ?? "—"}
                    </p>
                    <p className="text-xs text-neutro-500">
                      {item.quantidade} entregues
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`sobra-${item.produto_id}`}>
                        Sobrou
                      </Label>
                      <Input
                        id={`sobra-${item.produto_id}`}
                        type="number"
                        min={0}
                        max={item.quantidade}
                        inputMode="numeric"
                        value={sobras[item.produto_id] ?? ""}
                        onChange={(e) =>
                          alterarSobra(item.produto_id, e.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                    {sobra > 0 && (
                      <div className="flex shrink-0 gap-1 self-end pb-0.5">
                        <button
                          type="button"
                          onClick={() => alterarDestino(item.produto_id, "estoque")}
                          className={`min-h-9 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors duration-150 ${
                            destino === "estoque"
                              ? "border-salvia bg-salvia-bg text-salvia-text"
                              : "border-border-strong text-neutro-500 hover:bg-berinjela-50"
                          }`}
                        >
                          Voltou pro estoque
                        </button>
                        <button
                          type="button"
                          onClick={() => alterarDestino(item.produto_id, "perda")}
                          className={`min-h-9 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors duration-150 ${
                            destino === "perda"
                              ? "border-erro bg-erro-bg text-erro-text"
                              : "border-border-strong text-neutro-500 hover:bg-berinjela-50"
                          }`}
                        >
                          Estragou
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <Label htmlFor="acerto-valor">Valor recebido (R$)</Label>
            <Input
              id="acerto-valor"
              type="number"
              step="0.01"
              min={0}
              inputMode="decimal"
              value={valorExibido}
              onChange={(e) => setValorRecebido(e.target.value)}
            />
            <p className="mt-1 text-xs text-neutro-500">
              Sugerido pelo vendido: R$ {valorSugerido.toFixed(2)}. Ajuste se
              a igreja arredondou ou negociou.
            </p>
          </div>

          <div>
            <Label htmlFor="acerto-obs">Observações (opcional)</Label>
            <Textarea
              id="acerto-obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </FieldGroup>

        {erro && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-erro-bg px-3 py-2.5 text-sm text-erro-text">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {erro}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isPending}>
            Fechar acerto
          </Button>
        </div>
      </Modal>
    </>
  );
}
