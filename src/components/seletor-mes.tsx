"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { mesAnterior, mesSeguinte, rotuloMes, mesAtual } from "@/lib/competencia";

/**
 * Navegação de mês via query string (?mes=2026-08). Fica na URL de propósito:
 * dá pra voltar pelo botão do navegador e mandar o link de um mês específico.
 */
export function SeletorMes({ mes }: { mes: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function ir(novoMes: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", novoMes);
    router.push(`${pathname}?${params.toString()}`);
  }

  const proximo = mesSeguinte(mes);
  // não deixa navegar pro futuro: mês que ainda não começou não tem dado
  const podeAvancar = proximo <= mesAtual();

  const noMesAtual = mes === mesAtual();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-white p-0.5">
      <IconButton
        aria-label="Mês anterior"
        title="Mês anterior"
        onClick={() => ir(mesAnterior(mes))}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
      <button
        type="button"
        onClick={() => !noMesAtual && ir(mesAtual())}
        disabled={noMesAtual}
        title={noMesAtual ? undefined : "Voltar para o mês atual"}
        className="min-w-32 cursor-pointer rounded-md px-2 py-1.5 text-center text-sm font-medium capitalize text-berinjela transition-colors duration-150 ease-out enabled:hover:bg-berinjela-50 disabled:cursor-default"
      >
        {rotuloMes(mes)}
      </button>
      <IconButton
        aria-label="Próximo mês"
        title="Próximo mês"
        onClick={() => ir(proximo)}
        disabled={!podeAvancar}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
    </div>
  );
}
