import type { UnidadeBase } from "@/lib/types/database";

// unidade "grande" usada pra exibir custo/preço (por kg, por L, por un)
export const UNIDADE_GRANDE: Record<UnidadeBase, string> = {
  g: "kg",
  ml: "L",
  un: "un",
};
