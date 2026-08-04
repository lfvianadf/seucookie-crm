import type { CategoriaInsumo } from "@/lib/types/database";

// A ordem aqui é a ordem em que as categorias aparecem na tela e no seletor.
// Segue o caminho da receita — o que vai na massa primeiro, o que envolve o
// cookie depois, e "custos" por último, que não é matéria-prima.
export const CATEGORIA_ORDEM: CategoriaInsumo[] = [
  "secos",
  "molhados",
  "cremes",
  "chocolates",
  "topping",
  "embalagens",
  "outros",
  "custos",
];

export const CATEGORIA_LABEL: Record<CategoriaInsumo, string> = {
  secos: "Secos",
  molhados: "Molhados",
  cremes: "Cremes",
  chocolates: "Chocolates",
  topping: "Topping",
  embalagens: "Embalagens",
  outros: "Outros",
  custos: "Custos",
};

// Só aparece onde ajuda a decidir em qual categoria algo se encaixa —
// no seletor do cadastro, não na listagem.
export const CATEGORIA_HINT: Record<CategoriaInsumo, string> = {
  secos: "farinha, açúcar, cacau, fermento",
  molhados: "ovo, leite, manteiga, essência",
  cremes: "nutella, doce de leite, ganache",
  chocolates: "barra, cobertura, chocolate em pó, meio amargo",
  topping: "gotas de chocolate, castanha, granulado",
  embalagens: "caixa, sacola, adesivo, fita",
  outros: "o que não se encaixa nas outras — dá pra reclassificar depois",
  custos: "gás, energia, entrega — o que entra no custo sem ser ingrediente",
};

export function agruparPorCategoria<T extends { categoria: CategoriaInsumo }>(
  itens: T[]
) {
  return CATEGORIA_ORDEM.map((categoria) => ({
    categoria,
    label: CATEGORIA_LABEL[categoria],
    itens: itens.filter((item) => item.categoria === categoria),
  })).filter((grupo) => grupo.itens.length > 0);
}
