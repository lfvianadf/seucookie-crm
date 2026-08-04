"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Card de categoria que abre e fecha a lista de insumos abaixo.
 *
 * Começa fechado por padrão pra que a tela de Estoque caiba numa olhada só
 * — o valor de agrupar se perde se tudo continua aberto ao mesmo tempo. As
 * categorias com algo esgotado nascem abertas, porque é o que exige ação.
 */
export function CategoriaCard({
  label,
  total,
  alertas,
  children,
}: {
  label: string;
  total: number;
  /** quantos itens dessa categoria estão zerados */
  alertas: number;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(alertas > 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className={`flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-berinjela-50/60 ${
          aberto ? "border-b border-border" : ""
        }`}
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutro-400 transition-transform duration-150 ${
            aberto ? "" : "-rotate-90"
          }`}
          strokeWidth={2}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-berinjela">
          {label}
        </span>
        {alertas > 0 && (
          <span className="shrink-0 rounded-md bg-erro-bg px-2 py-0.5 text-xs font-medium text-erro-text">
            {alertas} sem estoque
          </span>
        )}
        <span className="shrink-0 text-xs text-neutro-500">{total}</span>
      </button>

      {aberto && <div className="p-2 md:p-0">{children}</div>}
    </section>
  );
}
