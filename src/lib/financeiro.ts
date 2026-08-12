import { createClient } from "@/lib/supabase/server";
import { intervaloDoMes, parcelaDoMes } from "@/lib/competencia";
import { calcularCustoReceita } from "@/lib/receita-custo";
import type { TipoCusto } from "@/lib/types/database";

export type ResumoFinanceiro = {
  vendas: number;
  pedidos: number;
  cookiesProduzidos: number;
  /** custo de receita dos produtos vendidos no mês */
  custoDosVendidos: number;
  /** dinheiro que saiu comprando insumo no mês (lotes lançados) */
  comprasDeInsumo: number;
  custosFixos: number;
  /** custo de produção do que se perdeu no mês */
  perdas: number;
  cookiesPerdidos: number;
  /** vendas − custo dos vendidos − custos fixos − perdas */
  lucro: number;
  margemBruta: number;
  custos: {
    id: string;
    descricao: string;
    valor: number;
    tipo: TipoCusto;
    /** "3 de 10" em parcelado; null nos demais */
    parcela: { numero: number; total: number | null } | null;
    /** true quando vem repetido de um mês anterior, não lançado neste */
    herdado: boolean;
  }[];
};

/**
 * Números do mês.
 *
 * Duas visões de custo, que respondem perguntas diferentes e por isso não se
 * somam: `custoDosVendidos` é a margem real de cada venda (custo de receita
 * do que saiu), enquanto `comprasDeInsumo` é o caixa (o que você gastou
 * repondo estoque). Um mês em que você estoca muito tem compras altas sem
 * que a margem tenha piorado.
 *
 * O lucro usa o custo dos vendidos, não as compras — senão o resultado
 * oscilaria conforme o calendário de idas ao mercado.
 */
export async function carregarFinanceiro(mes: string): Promise<ResumoFinanceiro> {
  const supabase = await createClient();
  const { inicio, fim } = intervaloDoMes(mes);

  const [
    { data: pedidos },
    { data: producoes },
    { data: lotes },
    { data: perdasDoMes },
    { data: custosMensais },
    { data: produtos },
    { data: receitas },
    { data: receitaInsumos },
    { data: insumos },
  ] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, valor_total, status, pedido_itens(produto_id, quantidade)")
      .neq("status", "cancelado")
      .gte("data_pedido", inicio.toISOString())
      .lt("data_pedido", fim.toISOString()),
    supabase
      .from("producoes")
      .select("quantidade_produzida")
      .gte("data", inicio.toISOString())
      .lt("data", fim.toISOString()),
    supabase
      .from("insumo_lotes")
      .select("quantidade, preco_unitario")
      .gte("data", inicio.toISOString())
      .lt("data", fim.toISOString()),
    supabase
      .from("perdas")
      .select("quantidade, custo_unitario")
      .gte("data", inicio.toISOString())
      .lt("data", fim.toISOString()),
    supabase.from("custos_mensais").select("*").order("descricao"),
    supabase.from("produtos").select("id, receita_id"),
    supabase.from("receitas").select("id, rendimento_cookies"),
    supabase.from("receita_insumos").select("*"),
    supabase.from("insumos").select("*"),
  ]);

  const pedidosLista = pedidos ?? [];
  const vendas = pedidosLista.reduce((s, p) => s + Number(p.valor_total), 0);

  const cookiesProduzidos = (producoes ?? []).reduce(
    (s, p) => s + p.quantidade_produzida,
    0
  );

  // o lote guarda preço por unidade base, então quantidade × preço já dá o
  // valor pago pela compra inteira
  const comprasDeInsumo = (lotes ?? []).reduce(
    (s, l) => s + Number(l.quantidade) * Number(l.preco_unitario),
    0
  );

  // custo de receita por produto, calculado uma vez só
  const custoPorProduto = new Map<string, number>();
  for (const produto of produtos ?? []) {
    if (!produto.receita_id) continue;
    const receita = (receitas ?? []).find((r) => r.id === produto.receita_id);
    if (!receita) continue;
    const { custoPorCookie } = calcularCustoReceita(
      receita,
      receitaInsumos ?? [],
      insumos ?? []
    );
    custoPorProduto.set(produto.id, custoPorCookie);
  }

  const custoDosVendidos = pedidosLista.reduce((soma, pedido) => {
    const doPedido = pedido.pedido_itens.reduce(
      (s, item) =>
        s + (custoPorProduto.get(item.produto_id) ?? 0) * item.quantidade,
      0
    );
    return soma + doPedido;
  }, 0);

  const custos = (custosMensais ?? [])
    .map((c) => ({ custo: c, parcela: parcelaDoMes(c, mes) }))
    .filter((x) => x.parcela !== null)
    .map(({ custo: c, parcela }) => ({
      id: c.id,
      descricao: c.descricao,
      valor: Number(c.valor),
      tipo: c.tipo,
      parcela,
      herdado: c.competencia.slice(0, 7) !== mes,
    }));

  const custosFixos = custos.reduce((s, c) => s + c.valor, 0);

  // usa o custo congelado na perda, não o custo de receita de hoje — a perda
  // aconteceu com o preço de insumo daquele momento
  const perdas = (perdasDoMes ?? []).reduce(
    (s, p) => s + Number(p.custo_unitario) * p.quantidade,
    0
  );
  const cookiesPerdidos = (perdasDoMes ?? []).reduce(
    (s, p) => s + p.quantidade,
    0
  );

  const lucro = vendas - custoDosVendidos - custosFixos - perdas;

  return {
    vendas,
    pedidos: pedidosLista.length,
    cookiesProduzidos,
    custoDosVendidos,
    comprasDeInsumo,
    custosFixos,
    perdas,
    cookiesPerdidos,
    lucro,
    margemBruta: vendas > 0 ? ((vendas - custoDosVendidos) / vendas) * 100 : 0,
    custos,
  };
}
