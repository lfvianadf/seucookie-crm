import type { OkrMetrica } from "@/lib/types/database";
import type { ResumoFinanceiro } from "@/lib/financeiro";

export const METRICA_LABEL: Record<OkrMetrica, string> = {
  manual: "Atualizo na mão",
  vendas: "Vendas do mês (R$)",
  cookies: "Cookies produzidos",
  pedidos: "Pedidos do mês",
  lucro: "Lucro do mês (R$)",
};

/** Métricas em dinheiro são formatadas como R$; as demais, como número. */
export const METRICA_EM_REAIS: Record<OkrMetrica, boolean> = {
  manual: false,
  vendas: true,
  cookies: false,
  pedidos: false,
  lucro: true,
};

/**
 * Progresso de um resultado-chave.
 *
 * Métricas automáticas são lidas do resumo do mês na hora — guardar esse
 * número no banco criaria um valor velho na primeira venda seguinte.
 */
export function progressoDoResultado(
  resultado: { metrica: OkrMetrica; progresso_manual: number },
  financeiro: ResumoFinanceiro
) {
  switch (resultado.metrica) {
    case "vendas":
      return financeiro.vendas;
    case "cookies":
      return financeiro.cookiesProduzidos;
    case "pedidos":
      return financeiro.pedidos;
    case "lucro":
      return financeiro.lucro;
    case "manual":
      return Number(resultado.progresso_manual);
  }
}

export function formatarValor(valor: number, metrica: OkrMetrica) {
  return METRICA_EM_REAIS[metrica]
    ? `R$ ${valor.toFixed(2)}`
    : valor.toLocaleString("pt-BR");
}
