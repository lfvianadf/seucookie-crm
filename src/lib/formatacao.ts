const MOEDA_BR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export function formatarMoeda(valor: number | string) {
  return MOEDA_BR.format(Number(valor));
}
