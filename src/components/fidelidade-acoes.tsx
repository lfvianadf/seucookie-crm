"use client";

import { useTransition } from "react";
import { MessageCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registrarResgate } from "@/lib/actions/fidelidade";
import {
  calcularFidelidade,
  mensagemFidelidade,
  linkWhatsApp,
} from "@/lib/fidelidade";

export function FidelidadeAcoes({
  clienteId,
  nome,
  telefone,
  saldo,
}: {
  clienteId: string;
  nome: string;
  telefone: string;
  saldo: number;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const fidelidade = calcularFidelidade(saldo);
  const temCortesia = fidelidade.cortesias > 0;

  function resgatar() {
    startTransition(async () => {
      try {
        await registrarResgate(clienteId);
        toast("Cortesia entregue, cartão zerado");
      } catch (e) {
        toast(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível registrar."
        );
      }
    });
  }

  return (
    <div className="flex gap-2">
      {/* abre o WhatsApp com o texto pronto: você lê antes de enviar, em vez
          de o sistema disparar sozinho pelas suas costas */}
      <a
        href={linkWhatsApp(telefone, mensagemFidelidade(nome, fidelidade))}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 sm:flex-none"
      >
        <Button variant="secondary" className="w-full">
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          Avisar
        </Button>
      </a>

      {temCortesia && (
        <Button onClick={resgatar} loading={isPending} className="flex-1 sm:flex-none">
          <Gift className="h-4 w-4" strokeWidth={1.75} />
          Entreguei
        </Button>
      )}
    </div>
  );
}
