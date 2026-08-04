"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/modal";
import { UNIDADE_GRANDE } from "@/lib/unidade";
import type { ItemCusto } from "@/lib/receita-custo";

export function ReceitaCustoModal({
  nome,
  rendimento,
  custoReceita,
  custoPorCookie,
  cookiesPossiveis,
  itens,
  acoes,
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  rendimento: number;
  custoReceita: number;
  custoPorCookie: number;
  cookiesPossiveis: number;
  itens: ItemCusto[];
  /** editar/excluir — só aparece no mobile, onde não existe hover no card */
  acoes?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="w-full cursor-pointer text-left"
      >
        {children}
      </button>

      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        title={nome}
        description={`Rende ${rendimento} cookies · de onde vem cada centavo`}
        maxWidth="max-w-2xl"
      >
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-berinjela-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-neutro-500">
              Custo da receita
            </p>
            <p className="text-sm font-semibold text-berinjela">
              R$ {custoReceita.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-berinjela-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-neutro-500">
              Custo/cookie
            </p>
            <p className="text-sm font-semibold text-berinjela">
              R$ {custoPorCookie.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-berinjela-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-neutro-500">
              Dá pra fazer
            </p>
            <p
              className={`text-sm font-semibold ${
                cookiesPossiveis === 0 ? "text-erro-text" : "text-salvia-text"
              }`}
            >
              {cookiesPossiveis} cookies
            </p>
          </div>
        </div>

        {itens.length === 0 ? (
          <p className="rounded-lg border border-border px-4 py-8 text-center text-sm text-neutro-500">
            Essa receita ainda não tem insumos cadastrados.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {itens.map((item) => (
                <li key={item.insumoId} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-berinjela">
                      {item.nome}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-berinjela">
                      R$ {item.custoNaReceita.toFixed(2)}
                    </p>
                  </div>

                  <p className="mt-0.5 text-xs text-neutro-500">
                    {item.quantidade.toLocaleString("pt-BR")} {item.unidadeBase} ×
                    R$ {item.custoUnitario.toFixed(2)}/
                    {UNIDADE_GRANDE[item.unidadeBase]} · R${" "}
                    {item.custoPorCookie.toFixed(3)} por cookie
                  </p>

                  {/* a barra dá o peso relativo de relance, sem precisar
                      comparar número por número */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-berinjela-50">
                      <div
                        className="h-full rounded-full bg-rosa/60"
                        style={{ width: `${Math.max(item.fatiaDoCusto * 100, 1)}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs tabular-nums text-neutro-500">
                      {(item.fatiaDoCusto * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p
                    className={`mt-1.5 flex items-center gap-1 text-xs ${
                      item.ehGargalo ? "text-atencao-text" : "text-neutro-500"
                    }`}
                  >
                    {item.ehGargalo && (
                      <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                    )}
                    Estoque: {item.estoqueAtual.toLocaleString("pt-BR")}{" "}
                    {item.unidadeBase} ={" "}
                    {Math.floor(item.receitasPossiveis * rendimento)} cookies
                    {item.ehGargalo && " · é o que limita a produção"}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-berinjela">
                Total da receita
              </span>
              <span className="text-base font-semibold text-berinjela">
                R$ {custoReceita.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {acoes && (
          <div className="mt-4 flex items-center justify-end gap-1 border-t border-border pt-4 md:hidden">
            {acoes}
          </div>
        )}
      </Modal>
    </>
  );
}
