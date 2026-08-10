"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { atualizarProgressoManual } from "@/lib/actions/okrs";
import { useToast } from "@/components/ui/toast";

/**
 * Campo inline para atualizar o progresso de um KR manual. Só mostra o botão
 * de confirmar quando o valor muda — sem isso a linha ficaria com um botão
 * inerte o tempo todo.
 */
export function ProgressoManual({
  id,
  valor,
}: {
  id: string;
  valor: number;
}) {
  const [texto, setTexto] = useState(String(valor));
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const mudou = Number(texto) !== valor && texto.trim() !== "";

  function salvar() {
    const numero = Number(texto);
    if (Number.isNaN(numero)) return;
    startTransition(async () => {
      await atualizarProgressoManual(id, numero);
      toast("Progresso atualizado");
    });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        min={0}
        inputMode="decimal"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && mudou) salvar();
        }}
        disabled={isPending}
        className="w-20 rounded-md border border-border-strong px-2 py-1 text-sm text-berinjela outline-none transition-colors duration-150 focus:border-rosa disabled:opacity-50"
      />
      {mudou && (
        <button
          type="button"
          onClick={salvar}
          disabled={isPending}
          aria-label="Salvar progresso"
          title="Salvar"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-rosa text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
