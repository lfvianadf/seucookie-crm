"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();
  // mostra o rótulo do mês pra onde o clique já apontou, não o que ainda
  // está na URL — sem isso o texto só troca quando a Server Component
  // termina de recarregar, e o clique parece não ter feito nada
  const [mesOtimista, setMesOtimista] = useState(mes);
  const mesExibido = isPending ? mesOtimista : mes;

  function ir(novoMes: string) {
    setMesOtimista(novoMes);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", novoMes);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const proximo = mesSeguinte(mes);
  // não deixa navegar pro futuro: mês que ainda não começou não tem dado
  const podeAvancar = proximo <= mesAtual();

  const noMesAtual = mesExibido === mesAtual();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-white p-0.5">
      <IconButton
        aria-label="Mês anterior"
        title="Mês anterior"
        onClick={() => ir(mesAnterior(mes))}
        disabled={isPending}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
      <button
        type="button"
        onClick={() => !noMesAtual && ir(mesAtual())}
        disabled={noMesAtual || isPending}
        title={noMesAtual ? undefined : "Voltar para o mês atual"}
        className="flex min-w-32 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-center text-sm font-medium capitalize text-berinjela transition-colors duration-150 ease-out enabled:hover:bg-berinjela-50 disabled:cursor-default"
      >
        {isPending && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-neutro-400" />
        )}
        <span className={isPending ? "text-neutro-400" : ""}>
          {rotuloMes(mesExibido)}
        </span>
      </button>
      <IconButton
        aria-label="Próximo mês"
        title="Próximo mês"
        onClick={() => ir(proximo)}
        disabled={!podeAvancar || isPending}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
    </div>
  );
}
