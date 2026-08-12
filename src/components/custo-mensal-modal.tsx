"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarCustoMensal, atualizarCustoMensal } from "@/lib/actions/financeiro";
import { rotuloMes } from "@/lib/competencia";
import type { TipoCusto } from "@/lib/types/database";

const TIPO_LABEL: Record<TipoCusto, string> = {
  unica: "Uma vez",
  recorrente: "Todo mês",
  parcelado: "Parcelado",
};

type CustoExistente = {
  id: string;
  descricao: string;
  valor: number;
  tipo: TipoCusto;
  parcela: { numero: number; total: number | null } | null;
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
  const [tipo, setTipo] = useState<TipoCusto>(custoExistente?.tipo ?? "unica");
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
              <Label htmlFor="custo-valor">
                {tipo === "parcelado" ? "Valor da parcela (R$)" : "Valor (R$)"}
              </Label>
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

            <div>
              <Label>Como se repete</Label>
              {/* botões em vez de select: são três opções e a escolha muda o
                  resto do formulário, então precisa estar toda à vista */}
              <div className="flex gap-2">
                {(Object.keys(TIPO_LABEL) as TipoCusto[]).map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setTipo(valor)}
                    className={`min-h-11 flex-1 cursor-pointer rounded-lg border px-2 text-sm font-medium transition-colors duration-150 ${
                      tipo === valor
                        ? "border-rosa bg-rosa/10 text-berinjela"
                        : "border-border-strong text-neutro-500 hover:bg-berinjela-50"
                    }`}
                  >
                    {TIPO_LABEL[valor]}
                  </button>
                ))}
              </div>
              <input type="hidden" name="tipo" value={tipo} />
              <p className="mt-1.5 text-xs text-neutro-500">
                {tipo === "unica" && "Cai só neste mês."}
                {tipo === "recorrente" &&
                  "Aparece sozinho todo mês. Dá pra encerrar depois sem perder o histórico."}
                {tipo === "parcelado" &&
                  "Aparece pelos próximos meses e some sozinho quando acabar."}
              </p>
            </div>

            {tipo === "parcelado" && (
              <div>
                <Label htmlFor="custo-parcelas">Número de parcelas</Label>
                <Input
                  id="custo-parcelas"
                  name="parcelas"
                  type="number"
                  min={2}
                  inputMode="numeric"
                  defaultValue={custoExistente?.parcela?.total ?? ""}
                  placeholder="ex: 10"
                  required
                />
              </div>
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
            <Button type="submit" loading={isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
