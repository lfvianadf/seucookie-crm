import type { UnidadeBase } from "@/lib/types/database";

type Insumo = {
  id: string;
  unidade_base: UnidadeBase;
  custo_medio_por_unidade: number;
  estoque_atual: number;
};

type ReceitaInsumo = {
  receita_id: string;
  insumo_id: string;
  quantidade: number;
};

type Receita = {
  id: string;
  rendimento_cookies: number;
};

// custo_medio_por_unidade é sempre por kg/L/un — normaliza de volta pra
// g/ml/un antes de multiplicar pela quantidade da receita (que é em g/ml/un).
function custoPorGramaOuMl(insumo: Insumo) {
  const fator = insumo.unidade_base === "un" ? 1 : 1000;
  return Number(insumo.custo_medio_por_unidade) / fator;
}

export function calcularCustoReceita(
  receita: Receita,
  receitaInsumos: ReceitaInsumo[],
  insumos: Insumo[]
) {
  const itensReceita = receitaInsumos.filter(
    (ri) => ri.receita_id === receita.id
  );

  const custoReceita = itensReceita.reduce((soma, ri) => {
    const insumo = insumos.find((i) => i.id === ri.insumo_id);
    if (!insumo) return soma;
    return soma + ri.quantidade * custoPorGramaOuMl(insumo);
  }, 0);

  const custoPorCookie =
    receita.rendimento_cookies > 0 ? custoReceita / receita.rendimento_cookies : 0;

  let gargaloRazao = Infinity;
  let gargaloInsumoId: string | null = null;
  for (const ri of itensReceita) {
    const insumo = insumos.find((i) => i.id === ri.insumo_id);
    if (!insumo || ri.quantidade <= 0) continue;
    const razao = Number(insumo.estoque_atual) / ri.quantidade;
    if (razao < gargaloRazao) {
      gargaloRazao = razao;
      gargaloInsumoId = insumo.id;
    }
  }

  const cookiesPossiveis =
    itensReceita.length > 0 && Number.isFinite(gargaloRazao)
      ? Math.max(0, Math.floor(gargaloRazao * receita.rendimento_cookies))
      : 0;

  return { custoReceita, custoPorCookie, cookiesPossiveis, gargaloInsumoId };
}
