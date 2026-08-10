import { Suspense } from "react";
import { Target, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { carregarFinanceiro } from "@/lib/financeiro";
import { mesAtual, competenciaDe } from "@/lib/competencia";
import { excluirOkr } from "@/lib/actions/okrs";
import {
  progressoDoResultado,
  formatarValor,
  METRICA_LABEL,
} from "@/lib/okr-metrica";
import { SeletorMes } from "@/components/seletor-mes";
import { OkrModal } from "@/components/okr-modal";
import { ProgressoManual } from "@/components/progresso-manual";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function OkrsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam ?? mesAtual();

  const supabase = await createClient();
  const [{ data: okrs }, financeiro] = await Promise.all([
    supabase
      .from("okrs")
      .select("id, objetivo, okr_resultados(id, descricao, metrica, alvo, progresso_manual)")
      .eq("competencia", competenciaDe(mes))
      .order("created_at"),
    carregarFinanceiro(mes),
  ]);

  const okrsLista = okrs ?? [];

  return (
    <div>
      <PageHeader
        title="Metas"
        description="Objetivos do mês e o quanto você já andou em cada um."
        action={
          <OkrModal
            mes={mes}
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Nova meta
              </Button>
            }
          />
        }
      />

      <div className="mb-4">
        {/* SeletorMes usa useSearchParams, que exige um limite de Suspense */}
        <Suspense fallback={<div className="h-8" />}>
          <SeletorMes mes={mes} />
        </Suspense>
      </div>

      {okrsLista.length ? (
        <div className="space-y-3">
          {okrsLista.map((okr) => {
            const resultados = okr.okr_resultados.map((r) => {
              const atual = progressoDoResultado(r, financeiro);
              return {
                ...r,
                atual,
                percentual: r.alvo > 0 ? Math.min((atual / r.alvo) * 100, 100) : 0,
                batido: atual >= r.alvo,
              };
            });

            // o progresso do objetivo é a média dos KRs, cada um limitado a
            // 100% — senão um KR muito acima da meta mascararia outro parado
            const geral = resultados.length
              ? resultados.reduce((s, r) => s + r.percentual, 0) / resultados.length
              : 0;

            return (
              <div
                key={okr.id}
                className="group rounded-xl border border-border bg-white"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-berinjela">
                      {okr.objetivo}
                    </p>
                    <p className="mt-0.5 text-xs text-neutro-500">
                      {resultados.filter((r) => r.batido).length} de{" "}
                      {resultados.length} resultados batidos
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        geral >= 100 ? "text-salvia-text" : "text-berinjela"
                      }`}
                    >
                      {geral.toFixed(0)}%
                    </span>
                    <div className="flex items-center gap-1 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <OkrModal
                        mes={mes}
                        okrExistente={{
                          id: okr.id,
                          objetivo: okr.objetivo,
                          resultados: okr.okr_resultados,
                        }}
                        trigger={
                          <IconButton aria-label="Editar meta" title="Editar">
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </IconButton>
                        }
                      />
                      <ConfirmDeleteButton
                        itemName={okr.objetivo}
                        label="Meta"
                        onConfirm={excluirOkr.bind(null, okr.id)}
                      />
                    </div>
                  </div>
                </div>

                <ul className="divide-y divide-border">
                  {resultados.map((r) => (
                    <li key={r.id} className="px-4 py-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-berinjela">
                            {r.descricao}
                          </p>
                          <p className="mt-0.5 text-xs text-neutro-500">
                            {METRICA_LABEL[r.metrica]}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {r.metrica === "manual" ? (
                            <ProgressoManual
                              id={r.id}
                              valor={Number(r.progresso_manual)}
                            />
                          ) : (
                            <span className="text-sm font-medium text-berinjela">
                              {formatarValor(r.atual, r.metrica)}
                            </span>
                          )}
                          <span className="text-xs text-neutro-500">
                            / {formatarValor(Number(r.alvo), r.metrica)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-berinjela-50">
                          <div
                            className={`h-full rounded-full ${
                              r.batido ? "bg-salvia" : "bg-rosa/60"
                            }`}
                            style={{ width: `${Math.max(r.percentual, 1)}%` }}
                          />
                        </div>
                        <span
                          className={`w-9 shrink-0 text-right text-xs tabular-nums ${
                            r.batido ? "text-salvia-text" : "text-neutro-500"
                          }`}
                        >
                          {r.percentual.toFixed(0)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="Nenhuma meta neste mês. Defina a primeira."
          action={
            <OkrModal
              mes={mes}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Nova meta
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
