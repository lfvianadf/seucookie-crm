"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registrarEntradaInsumo } from "@/lib/actions/insumos";
import { UNIDADE_GRANDE } from "@/lib/unidade";
import type { UnidadeBase } from "@/lib/types/database";

type Insumo = {
  id: string;
  nome: string;
  unidade_base: UnidadeBase;
};

export function EntradaInsumoModal({
  insumo,
  trigger,
}: {
  insumo: Insumo;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const unidade = UNIDADE_GRANDE[insumo.unidade_base];
  const qtd = Number(quantidade);
  const valor = Number(valorPago);
  const precoUnitario =
    qtd > 0 && valor > 0 ? (valor / qtd).toFixed(2) : null;

  function handleSubmit() {
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
        await registrarEntradaInsumo({
          insumoId: insumo.id,
          quantidade: qtd,
          valorPago: valor,
        });
        setOpen(false);
        setQuantidade("");
        setValorPago("");
        toast("Entrada registrada, custo médio atualizado");
      } catch {
        setErro("Não foi possível registrar. Tente de novo.");
      }
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Entrada de ${insumo.nome}`}
        description="Lançamento rápido de compra. Soma ao estoque e recalcula o custo médio ponderado."
      >
        <FieldGroup className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entrada-quantidade">
                Quantidade ({unidade})
              </Label>
              <Input
                id="entrada-quantidade"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="entrada-valor">Valor pago (R$)</Label>
              <Input
                id="entrada-valor"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
              />
            </div>
          </div>

          {precoUnitario && (
            <p className="text-xs text-neutro-500">
              Sai a R$ {precoUnitario} / {unidade} nessa compra.
            </p>
          )}
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
            Registrar entrada
          </Button>
        </div>
      </Modal>
    </>
  );
}
