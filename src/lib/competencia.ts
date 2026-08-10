/**
 * Competência = o mês de referência, sempre representado pelo dia 1º.
 *
 * Tudo aqui usa data local, não UTC. `new Date("2026-08-01")` seria
 * interpretado como meia-noite UTC e viraria 31/07 no Brasil — o que jogaria
 * lançamentos pro mês errado na virada.
 */

/** "2026-08" a partir de uma data. */
export function mesDe(data: Date | string) {
  const d = typeof data === "string" ? new Date(data) : data;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function mesAtual() {
  return mesDe(new Date());
}

/** "2026-08" → "2026-08-01", que é como a competência é gravada. */
export function competenciaDe(mes: string) {
  return `${mes}-01`;
}

/** Primeiro instante do mês e o do mês seguinte — para filtrar períodos. */
export function intervaloDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return {
    inicio: new Date(ano, m - 1, 1),
    fim: new Date(ano, m, 1),
  };
}

export function mesAnterior(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return mesDe(new Date(ano, m - 2, 1));
}

export function mesSeguinte(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return mesDe(new Date(ano, m, 1));
}

export function rotuloMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/** Últimos N meses, do mais recente pro mais antigo. */
export function ultimosMeses(quantidade: number) {
  const hoje = new Date();
  return Array.from({ length: quantidade }, (_, i) =>
    mesDe(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1))
  );
}

/**
 * Um custo pertence ao mês se foi lançado nele, ou se é recorrente e o mês
 * está entre a competência de origem e o encerramento.
 *
 * A recorrência é projetada aqui em vez de gerar linhas futuras no banco:
 * assim editar o valor de um custo mensal não exige caçar doze cópias, e
 * encerrar não deixa lançamentos órfãos no futuro.
 */
export function custoValeNoMes(
  custo: { competencia: string; recorrente: boolean; encerrado_em: string | null },
  mes: string
) {
  const origem = custo.competencia.slice(0, 7);
  if (origem === mes) return true;
  if (!custo.recorrente) return false;
  if (mes < origem) return false;
  if (custo.encerrado_em && mes > custo.encerrado_em.slice(0, 7)) return false;
  return true;
}
