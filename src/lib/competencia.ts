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

/** Início (inclusivo) e fim (exclusivo) de um intervalo de tempo qualquer. */
export type Periodo = { inicio: Date; fim: Date };

/** Alias de intervaloDoMes — mesma coisa, nome que combina com Periodo. */
export function periodoDoMes(mes: string): Periodo {
  return intervaloDoMes(mes);
}

export function diasNoMes(ano: number, mes1a12: number) {
  return new Date(ano, mes1a12, 0).getDate();
}

/** "1 a 15 de set" (mesmo mês) ou "15 set – 3 out" (cruza meses), pt-BR. */
export function rotuloPeriodo(periodo: Periodo) {
  // fim é exclusivo — o último dia do período é o dia anterior
  const ultimoDia = new Date(periodo.fim.getTime() - 1);
  const mesmoMes =
    periodo.inicio.getFullYear() === ultimoDia.getFullYear() &&
    periodo.inicio.getMonth() === ultimoDia.getMonth();

  if (mesmoMes) {
    const mesRotulo = ultimoDia.toLocaleDateString("pt-BR", { month: "short" });
    return `${periodo.inicio.getDate()} a ${ultimoDia.getDate()} de ${mesRotulo}`;
  }

  const inicioRotulo = periodo.inicio.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
  const fimRotulo = ultimoDia.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
  return `${inicioRotulo} – ${fimRotulo}`;
}

/**
 * Para cada mês-calendário que o período intercepta, quantos dias desse mês
 * caem dentro do período — a base do rateio proporcional de custo por dia.
 */
export function mesesInterceptados(periodo: Periodo) {
  const resultado: { mes: string; dias: number; diasNoMes: number }[] = [];
  // cursor no 1º dia do mês do início, avança mês a mês até passar do fim
  let cursor = new Date(periodo.inicio.getFullYear(), periodo.inicio.getMonth(), 1);

  while (cursor < periodo.fim) {
    const inicioMes = cursor;
    const fimMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

    const inicioIntersecao = periodo.inicio > inicioMes ? periodo.inicio : inicioMes;
    const fimIntersecao = periodo.fim < fimMes ? periodo.fim : fimMes;

    const umDiaMs = 24 * 60 * 60 * 1000;
    const dias = Math.round((fimIntersecao.getTime() - inicioIntersecao.getTime()) / umDiaMs);

    if (dias > 0) {
      resultado.push({
        mes: mesDe(inicioMes),
        dias,
        diasNoMes: diasNoMes(inicioMes.getFullYear(), inicioMes.getMonth() + 1),
      });
    }

    cursor = fimMes;
  }

  return resultado;
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

/** Quantos meses de `origem` até `mes`. Negativo se `mes` for anterior. */
export function distanciaEmMeses(origem: string, mes: string) {
  const [anoO, mO] = origem.split("-").map(Number);
  const [anoM, mM] = mes.split("-").map(Number);
  return (anoM - anoO) * 12 + (mM - mO);
}

type CustoCompetencia = {
  competencia: string;
  tipo: "unica" | "recorrente" | "parcelado";
  parcelas: number | null;
  encerrado_em: string | null;
};

/**
 * Em que mês um custo aparece, e — se parcelado — qual parcela é.
 *
 * A repetição é projetada aqui em vez de gerar linhas futuras no banco:
 * assim corrigir o valor de uma conta em 10x não exige caçar dez cópias, e
 * encerrar uma recorrente não deixa lançamentos órfãos no futuro.
 *
 * Retorna null quando o custo não vale naquele mês.
 */
export function parcelaDoMes(custo: CustoCompetencia, mes: string) {
  const origem = custo.competencia.slice(0, 7);
  const distancia = distanciaEmMeses(origem, mes);

  if (distancia < 0) return null;

  if (custo.tipo === "unica") {
    return distancia === 0 ? { numero: 1, total: 1 } : null;
  }

  if (custo.tipo === "parcelado") {
    const total = custo.parcelas ?? 1;
    return distancia < total ? { numero: distancia + 1, total } : null;
  }

  // recorrente: vai até ser encerrado
  if (custo.encerrado_em && mes > custo.encerrado_em.slice(0, 7)) return null;
  return { numero: distancia + 1, total: null };
}

/**
 * Fração de um custo que cai dentro do período, rateada proporcionalmente
 * aos dias de cada mês-calendário que o período intercepta. Um custo
 * recorrente pode contribuir com pedaços de mais de uma parcela se o
 * período cruzar a virada do mês — cada pedaço vem como uma entrada própria.
 */
export function parcelaNoPeriodo(custo: CustoCompetencia, periodo: Periodo) {
  const resultado: {
    mes: string;
    numero: number;
    total: number | null;
    fracaoDias: number;
  }[] = [];

  for (const { mes, dias, diasNoMes: diasDoMes } of mesesInterceptados(periodo)) {
    const parcela = parcelaDoMes(custo, mes);
    if (!parcela) continue;
    resultado.push({ ...parcela, mes, fracaoDias: dias / diasDoMes });
  }

  return resultado;
}
