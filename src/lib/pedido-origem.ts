import type { PedidoOrigem } from "@/lib/types/database";
import type { BadgeTone } from "@/components/ui/badge";

export const ORIGEM_LABEL: Record<PedidoOrigem, string> = {
  site: "Site",
  manual: "Manual",
  ifood: "iFood",
};

export const ORIGEM_TONE: Record<PedidoOrigem, BadgeTone> = {
  site: "neutral",
  manual: "neutral",
  ifood: "erro",
};
