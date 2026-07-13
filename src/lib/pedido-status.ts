import type { PedidoStatus } from "@/lib/types/database";
import type { BadgeTone } from "@/components/ui/badge";

export const STATUS_ORDEM: PedidoStatus[] = [
  "novo",
  "em_producao",
  "pronto",
  "saiu_entrega",
  "entregue",
  "cancelado",
];

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  novo: "Recebido",
  em_producao: "Em produção",
  pronto: "Pedido pronto",
  saiu_entrega: "Rota de entrega",
  entregue: "Pedido entregue",
  cancelado: "Cancelado",
};

export const STATUS_TONE: Record<PedidoStatus, BadgeTone> = {
  novo: "neutral",
  em_producao: "atencao",
  pronto: "salvia",
  saiu_entrega: "atencao",
  entregue: "salvia",
  cancelado: "erro",
};

export const STATUS_COLUNA_ACCENT: Record<PedidoStatus, string> = {
  novo: "border-t-neutro-300",
  em_producao: "border-t-atencao",
  pronto: "border-t-salvia",
  saiu_entrega: "border-t-atencao",
  entregue: "border-t-salvia",
  cancelado: "border-t-erro",
};

export const STATUS_SELECT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-berinjela-50 text-neutro-700",
  salvia: "bg-salvia-bg text-salvia-text",
  atencao: "bg-atencao-bg text-atencao-text",
  erro: "bg-erro-bg text-erro-text",
};
