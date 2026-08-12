"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { editarLoteInsumo, excluirLoteInsumo } from "@/lib/actions/insumos";
import { UNIDADE_GRANDE } from "@/lib/unidade";
import type { UnidadeBase } from "@/lib/types/database";

type Lote = {
  id: string;
  quantidade: number;
  quantidade_restante: number;
  preco_unitario: number;
  data: string;
};

export function LoteModal({
  lote,
  insumoId,
  unidadeBase,
  trigger,
}: {
  lote: Lote;
  insumoId: string;
  unidadeBase: UnidadeBase;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  // o banco guarda em g/ml/un; a tela conversa em kg/L/un
  const fator = unidadeBase === "un" ? 1 : 1000;
  const unidade = UNIDADE_GRANDE[unidadeBase];

  const [quantidade, setQuantidade] = useState(
    String(Number(lote.quantidade) / fator)
  );
  const [valorPago, setValorPago] = useState(
    String((Number(lote.quantidade) * Number(lote.preco_unitario)).toFixed(2))
  );
  const [data, setData] = useState(lote.data.slice(0, 10));

  const consumido = Number(lote.quantidade) - Number(lote.quantidade_restante);
  const intocado = consumido <= 0;

  const qtd = Number(quantidade);
  const valor = Number(valorPago);
  const precoUnitario = qtd > 0 && valor > 0 ? (valor / qtd).toFixed(2) : null;

  function salvar() {
    setErro(null);
    if (Number.isNaN(qtd) || qtd <= 0) {
      setErro("Informe a quantidade comprada.");
      return;
    }
    if (Number.isNaN(valor) || valor < 0) {
      setErro("Informe quanto você pagou.");
      return;
    }

    startTransition(async () => {
      try {
        await editarLoteInsumo({
          loteId: lote.id,
          insumoId,
          quantidade: qtd,
          valorPago: valor,
          data: data ? new Date(data).toISOString() : undefined,
        });
        setOpen(false);
        toast("Entrada corrigida, custo recalculado");
      } catch (e) {
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível salvar."
        );
      }
    });
  }

  function excluir() {
    setErro(null);
    startTransition(async () => {
      try {
        await excluirLoteInsumo(lote.id, insumoId);
        setOpen(false);
        toast("Entrada excluída");
      } catch (e) {
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível excluir."
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
        title="Corrigir entrada"
        description="Ajusta o lançamento e recalcula o custo médio do insumo."
        maxWidth="max-w-md"
      >
        <FieldGroup className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lote-quantidade">Quantidade ({unidade})</Label>
              <Input
                id="lote-quantidade"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="lote-valor">Valor pago (R$)</Label>
              <Input
                id="lote-valor"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lote-data">Data da compra</Label>
            <Input
              id="lote-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
            <p className="mt-1 text-xs text-neutro-500">
              A ordem de consumo segue a data. Mudar aqui afeta as próximas
              produções, não as que já foram registradas.
            </p>
          </div>

          {precoUnitario && (
            <p className="text-xs text-neutro-500">
              Sai a R$ {precoUnitario} / {unidade} nessa compra.
            </p>
          )}

          {!intocado && (
            <p className="rounded-lg bg-atencao-bg px-3 py-2.5 text-xs text-atencao-text">
              {consumido.toLocaleString("pt-BR")} {unidadeBase} desse lote já
              viraram cookie. A quantidade não pode ficar abaixo disso, e o
              lote não pode ser excluído.
            </p>
          )}
        </FieldGroup>

        {erro && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-erro-bg px-3 py-2.5 text-sm text-erro-text">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {erro}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-5">
          {intocado ? (
            <Button
              type="button"
              variant="destructive"
              onClick={excluir}
              disabled={isPending}
            >
              Excluir entrada
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={salvar} loading={isPending}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
