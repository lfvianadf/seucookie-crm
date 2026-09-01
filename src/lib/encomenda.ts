import type { PedidoTipoVenda, ProdutoCanal } from "@/lib/types/database";
import type { BadgeTone } from "@/components/ui/badge";

export const TIPO_VENDA_LABEL: Record<PedidoTipoVenda, string> = {
  varejo: "Varejo",
  encomenda: "Encomenda",
};

// Ordem em que os grupos de canal aparecem no Cardápio.
export const CANAL_ORDEM: ProdutoCanal[] = ["varejo", "ambos", "encomenda"];

export const CANAL_LABEL: Record<ProdutoCanal, string> = {
  varejo: "Varejo",
  ambos: "Varejo e encomenda",
  encomenda: "Encomenda",
};

// Só aparece no seletor de cadastro do produto, pra ajudar a decidir.
export const CANAL_HINT: Record<ProdutoCanal, string> = {
  varejo: "vende no site, pro amigo, no balcão — preço normal",
  ambos: "o mesmo produto serve os dois canais",
  encomenda:
    "preço de atacado, só aparece ao criar encomenda — nunca no site, mesmo se marcado disponível",
};

export function agruparPorCanal<T extends { canal: ProdutoCanal }>(
  itens: T[]
) {
  return CANAL_ORDEM.map((canal) => ({
    canal,
    label: CANAL_LABEL[canal],
    itens: itens.filter((item) => item.canal === canal),
  })).filter((grupo) => grupo.itens.length > 0);
}

/** Um produto de encomenda serve pedidos de encomenda; 'ambos' serve os dois. */
export function produtoValeNoTipoVenda(
  canal: ProdutoCanal,
  tipoVenda: PedidoTipoVenda
) {
  return canal === tipoVenda || canal === "ambos";
}

export type SituacaoEncomenda =
  | "agendada"
  | "atrasada"
  | "entregue_pendente"
  | "acertada";

export const SITUACAO_ENCOMENDA_LABEL: Record<SituacaoEncomenda, string> = {
  agendada: "Agendada",
  atrasada: "Atrasada",
  entregue_pendente: "Aguardando acerto",
  acertada: "Acertada",
};

export const SITUACAO_ENCOMENDA_TONE: Record<SituacaoEncomenda, BadgeTone> = {
  agendada: "neutral",
  atrasada: "erro",
  entregue_pendente: "atencao",
  acertada: "salvia",
};

/**
 * Deriva a situação a partir do que já existe (status, data prevista,
 * existência de acerto) — nunca guardada, pelo mesmo motivo de o cartão
 * fidelidade não guardar contador: um campo redundante desanda em silêncio
 * quando o pedido é editado por outro caminho.
 */
export function situacaoEncomenda(pedido: {
  status: string;
  data_entrega_prevista: string | null;
  temAcerto: boolean;
}): SituacaoEncomenda {
  if (pedido.temAcerto) return "acertada";
  if (pedido.status === "entregue") return "entregue_pendente";
  const atrasada =
    !!pedido.data_entrega_prevista &&
    new Date(pedido.data_entrega_prevista) < new Date();
  return atrasada ? "atrasada" : "agendada";
}
