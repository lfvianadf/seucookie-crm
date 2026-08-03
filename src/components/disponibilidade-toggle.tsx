"use client";

import { useTransition } from "react";
import { alternarDisponibilidade } from "@/lib/actions/produtos";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

export function DisponibilidadeToggle({
  id,
  disponivel,
}: {
  id: string;
  disponivel: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function handleClick() {
    startTransition(async () => {
      await alternarDisponibilidade(id, !disponivel);
      toast(disponivel ? "Marcado como indisponível" : "Marcado como disponível");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="cursor-pointer transition-opacity duration-150 disabled:opacity-50"
    >
      <Badge tone={disponivel ? "salvia" : "neutral"}>
        {disponivel ? "Disponível" : "Indisponível"}
      </Badge>
    </button>
  );
}
