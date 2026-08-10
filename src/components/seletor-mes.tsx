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

  return (
    <div className="flex items-center gap-1">
      <IconButton
        aria-label="Mês anterior"
        title="Mês anterior"
        onClick={() => ir(mesAnterior(mes))}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
      <span className="min-w-36 text-center text-sm font-medium capitalize text-berinjela">
        {rotuloMes(mes)}
      </span>
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
