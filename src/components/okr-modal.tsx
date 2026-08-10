"use client";

import { useState, useTransition } from "react";
import { X, AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, Select, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarOkr, atualizarOkr } from "@/lib/actions/okrs";
import { METRICA_LABEL } from "@/lib/okr-metrica";
import { rotuloMes } from "@/lib/competencia";
import type { OkrMetrica } from "@/lib/types/database";

type ResultadoEdicao = {
  id?: string;
  descricao: string;
  metrica: OkrMetrica;
  alvo: string;
};

type OkrExistente = {
  id: string;
  objetivo: string;
  resultados: { id: string; descricao: string; metrica: OkrMetrica; alvo: number }[];
};

const METRICAS = Object.keys(METRICA_LABEL) as OkrMetrica[];

export function OkrModal({
  mes,
  okrExistente,
  trigger,
}: {
  mes: string;
  okrExistente?: OkrExistente;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [objetivo, setObjetivo] = useState(okrExistente?.objetivo ?? "");
  const [resultados, setResultados] = useState<ResultadoEdicao[]>(
    okrExistente?.resultados.map((r) => ({
      id: r.id,
      descricao: r.descricao,
      metrica: r.metrica,
      alvo: String(r.alvo),
    })) ?? [{ descricao: "", metrica: "vendas", alvo: "" }]
  );
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function alterar(indice: number, campo: keyof ResultadoEdicao, valor: string) {
    setResultados((prev) =>
      prev.map((r, i) => (i === indice ? { ...r, [campo]: valor } : r))
    );
  }

  function adicionar() {
    setResultados((prev) => [
      ...prev,
      { descricao: "", metrica: "manual", alvo: "" },
    ]);
  }

  function remover(indice: number) {
    setResultados((prev) => prev.filter((_, i) => i !== indice));
  }

  function handleSubmit() {
    setErro(null);

    if (!objetivo.trim()) {
      setErro("Escreva o objetivo.");
      return;
    }

    const validos = resultados.filter((r) => r.descricao.trim() && r.alvo);
    if (validos.length === 0) {
      setErro("Adicione ao menos um resultado-chave com descrição e alvo.");
      return;
    }
    if (validos.some((r) => Number(r.alvo) <= 0 || Number.isNaN(Number(r.alvo)))) {
      setErro("O alvo precisa ser um número maior que zero.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = validos.map((r) => ({
          id: r.id,
          descricao: r.descricao,
          metrica: r.metrica,
          alvo: Number(r.alvo),
        }));

        if (okrExistente) {
          await atualizarOkr({
            id: okrExistente.id,
            objetivo,
            resultados: payload,
          });
        } else {
          await criarOkr({ objetivo, mes, resultados: payload });
          setObjetivo("");
          setResultados([{ descricao: "", metrica: "vendas", alvo: "" }]);
        }
        setOpen(false);
        toast(okrExistente ? "Meta salva" : "Meta criada");
      } catch (e) {
        setErro(
          e instanceof Error && e.message ? e.message : "Não foi possível salvar."
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
        title={okrExistente ? "Editar meta" : "Nova meta"}
        description={
          okrExistente ? undefined : `Objetivo para ${rotuloMes(mes)}.`
        }
        maxWidth="max-w-2xl"
      >
        <FieldGroup className="mb-6">
          <div>
            <Label htmlFor="okr-objetivo">Objetivo</Label>
            <Input
              id="okr-objetivo"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="ex: Firmar a marca no bairro"
              autoFocus
            />
          </div>

          <div>
            <Label>Resultados-chave</Label>
            <p className="mb-2 text-xs text-neutro-500">
              Escolha uma métrica do sistema pro progresso ser calculado
              sozinho, ou &ldquo;atualizo na mão&rdquo; pro que ele não mede.
            </p>

            <div className="space-y-2">
              {resultados.map((resultado, i) => (
                <div
                  key={resultado.id ?? i}
                  className="rounded-lg border border-border p-2.5"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Input
                      value={resultado.descricao}
                      onChange={(e) => alterar(i, "descricao", e.target.value)}
                      placeholder="ex: Vender R$ 5.000"
                      className="min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => remover(i)}
                      aria-label="Remover resultado"
                      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutro-400 transition-colors duration-150 hover:bg-erro-bg hover:text-erro"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={resultado.metrica}
                        onChange={(e) => alterar(i, "metrica", e.target.value)}
                      >
                        {METRICAS.map((m) => (
                          <option key={m} value={m}>
                            {METRICA_LABEL[m]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      inputMode="decimal"
                      value={resultado.alvo}
                      onChange={(e) => alterar(i, "alvo", e.target.value)}
                      placeholder="Alvo"
                      className="w-28 shrink-0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={adicionar}
              className="mt-2"
            >
              Adicionar resultado
            </Button>
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
            Salvar
          </Button>
        </div>
      </Modal>
    </>
  );
}
