"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  mesAtual,
  mesAnterior,
  periodoDoMes,
  rotuloPeriodo,
  type Periodo,
} from "@/lib/competencia";

// "2026-09-15" a partir de uma data local — mesmo cuidado de não usar UTC
// que o resto de competencia.ts já toma, senão a virada do dia desloca.
function paraInputDate(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Navegação por período livre via query string (?inicio=&fim=). Substitui o
 * SeletorMes onde o usuário precisa olhar um recorte que não é um mês
 * inteiro (ex: só a primeira quinzena, ou um intervalo que cruza dois meses).
 */
export function SeletorPeriodo({ periodo }: { periodo: Periodo }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // fim é exclusivo internamente (mesmo padrão de intervaloDoMes), mas o
  // campo de data mostra o último dia incluído — por isso -1ms antes de
  // formatar, senão "31 de agosto" apareceria como "1 de setembro"
  const [periodoOtimista, setPeriodoOtimista] = useState(periodo);
  const periodoExibido = isPending ? periodoOtimista : periodo;

  function ir(novoInicio: Date, novoFim: Date) {
    setPeriodoOtimista({ inicio: novoInicio, fim: novoFim });
    const params = new URLSearchParams(searchParams.toString());
    params.set("inicio", paraInputDate(novoInicio));
    params.set("fim", paraInputDate(new Date(novoFim.getTime() - 1)));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleInicioChange(valor: string) {
    if (!valor) return;
    const novoInicio = deInputDate(valor);
    const fimAtual = new Date(periodoExibido.fim.getTime() - 1);
    ir(novoInicio, new Date(Math.max(fimAtual.getTime() + 1, novoInicio.getTime() + 1)));
  }

  function handleFimChange(valor: string) {
    if (!valor) return;
    const novoUltimoDia = deInputDate(valor);
    const novoFim = new Date(
      novoUltimoDia.getFullYear(),
      novoUltimoDia.getMonth(),
      novoUltimoDia.getDate() + 1
    );
    ir(periodoExibido.inicio, novoFim);
  }

  function irParaAtalho(mes: string) {
    const { inicio, fim } = periodoDoMes(mes);
    ir(inicio, fim);
  }

  const ultimoDiaExibido = new Date(periodoExibido.fim.getTime() - 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1">
        {isPending && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-neutro-400" />
        )}
        <input
          type="date"
          value={paraInputDate(periodoExibido.inicio)}
          onChange={(e) => handleInicioChange(e.target.value)}
          disabled={isPending}
          aria-label="Início do período"
          className="cursor-pointer rounded-md border-0 bg-transparent px-1 py-1 text-sm text-berinjela outline-none disabled:cursor-default"
        />
        <span className="text-neutro-400">–</span>
        <input
          type="date"
          value={paraInputDate(ultimoDiaExibido)}
          onChange={(e) => handleFimChange(e.target.value)}
          disabled={isPending}
          aria-label="Fim do período"
          className="cursor-pointer rounded-md border-0 bg-transparent px-1 py-1 text-sm text-berinjela outline-none disabled:cursor-default"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => irParaAtalho(mesAtual())}
          disabled={isPending}
          className="min-h-8 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-neutro-500 transition-colors duration-150 ease-out hover:bg-berinjela-50 hover:text-berinjela disabled:cursor-default disabled:opacity-50"
        >
          Este mês
        </button>
        <button
          type="button"
          onClick={() => irParaAtalho(mesAnterior(mesAtual()))}
          disabled={isPending}
          className="min-h-8 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-neutro-500 transition-colors duration-150 ease-out hover:bg-berinjela-50 hover:text-berinjela disabled:cursor-default disabled:opacity-50"
        >
          Mês passado
        </button>
      </div>

      <span className="text-xs capitalize text-neutro-400">
        {rotuloPeriodo(periodoExibido)}
      </span>
    </div>
  );
}
