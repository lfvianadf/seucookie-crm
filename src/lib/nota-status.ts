import type { NotaFiscalStatus } from "@/lib/types/database";
import type { BadgeTone } from "@/components/ui/badge";

export const NOTA_STATUS_LABEL: Record<NotaFiscalStatus, string> = {
  processando: "Processando",
  aguardando_validacao: "Aguardando validação",
  confirmada: "Confirmada",
};

export const NOTA_STATUS_TONE: Record<NotaFiscalStatus, BadgeTone> = {
  processando: "neutral",
  aguardando_validacao: "atencao",
  confirmada: "salvia",
};
