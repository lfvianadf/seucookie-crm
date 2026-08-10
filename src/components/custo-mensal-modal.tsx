"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarCustoMensal, atualizarCustoMensal } from "@/lib/actions/financeiro";
import { rotuloMes } from "@/lib/competencia";

type CustoExistente = {
  id: string;
  descricao: string;
  valor: number;
  recorrente: boolean;
};

export function CustoMensalModal({
  mes,
  custoExistente,
  trigger,
}: {
  mes: string;
  custoExistente?: CustoExistente;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (custoExistente) {
          await atualizarCustoMensal(custoExistente.id, formData);
        } else {
          await criarCustoMensal(formData);
          formRef.current?.reset();
        }
        setOpen(false);
        toast(custoExistente ? "Custo salvo" : "Custo lançado");
      } catch (e) {
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível salvar."
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
        title={custoExistente ? "Editar custo" : "Novo custo"}
        description={
          custoExistente ? undefined : `Lançamento em ${rotuloMes(mes)}.`
        }
        maxWidth="max-w-md"
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          <input type="hidden" name="mes" value={mes} />
          <FieldGroup className="mb-6">
            <div>
              <Label htmlFor="custo-descricao">Descrição</Label>
              <Input
                id="custo-descricao"
                name="descricao"
                defaultValue={custoExistente?.descricao}
                placeholder="ex: Energia, Aluguel, Taxa da maquininha"
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="custo-valor">Valor (R$)</Label>
              <Input
                id="custo-valor"
                name="valor"
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                defaultValue={custoExistente?.valor}
                required
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border-strong px-3 py-2.5">
              <input
                type="checkbox"
                name="recorrente"
                defaultChecked={custoExistente?.recorrente}
                className="mt-0.5 h-4 w-4 accent-rosa"
              />
              <span className="text-sm text-berinjela">
                Repete todo mês
                <span className="mt-0.5 block text-xs text-neutro-500">
                  Aparece sozinho nos próximos meses. Dá pra encerrar depois
                  sem perder o histórico.
                </span>
              </span>
            </label>
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
            <Button type="submit" loading={isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
