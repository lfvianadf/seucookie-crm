import { Suspense } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Factory,
  Wallet,
  Cookie,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SeletorMes } from "@/components/seletor-mes";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";
import { ESTOQUE_BAIXO } from "@/lib/estoque";
import { temAcertoRegistrado } from "@/lib/encomenda";
import { mesAtual, intervaloDoMes } from "@/lib/competencia";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam ?? mesAtual();
  const { inicio, fim } = intervaloDoMes(mes);

  const supabase = await createClient();

  // pendências (recebidos, em produção, encomendas a acertar, estoque
  // baixo) são sempre do AGORA, não do mês navegado — são coisas que
  // exigem ação hoje, independente de qual mês você está olhando pra trás
  const [
    { data: pedidosDoMes },
    { data: pendencias },
    { data: producoesDoMes },
    { data: produtos },
  ] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, status, tipo_venda, valor_total, data_pedido, clientes(nome)")
      .eq("tipo_venda", "varejo")
      .neq("status", "cancelado")
      .gte("data_pedido", inicio.toISOString())
      .lt("data_pedido", fim.toISOString())
      .order("data_pedido", { ascending: false }),
    supabase
      .from("pedidos")
      .select("id, status, tipo_venda, encomenda_acertos(id)")
      .neq("status", "cancelado"),
    supabase
      .from("producoes")
      .select("id, quantidade_produzida, data, receitas(nome), produtos(nome)")
      .gte("data", inicio.toISOString())
      .lt("data", fim.toISOString())
      .order("data", { ascending: false }),
    supabase
      .from("produtos")
      .select("id, nome, qtd_estoque, tipo_produto")
      .eq("tipo_produto", "cookie")
      .order("qtd_estoque", { ascending: true }),
  ]);

  const varejoDoMes = pedidosDoMes ?? [];
  const producoesLista = producoesDoMes ?? [];
  const pendenciasLista = pendencias ?? [];

  const pedidosNovos = pendenciasLista.filter(
    (p) => p.tipo_venda === "varejo" && p.status === "novo"
  ).length;
  const pedidosEmProducao = pendenciasLista.filter(
    (p) => p.tipo_venda === "varejo" && p.status === "em_producao"
  ).length;

  const faturamentoMes = varejoDoMes.reduce(
    (soma, p) => soma + Number(p.valor_total),
    0
  );

  const cookiesMes = producoesLista.reduce(
    (soma, p) => soma + p.quantidade_produzida,
    0
  );

  // entregue e ainda sem acerto — temAcertoRegistrado trata o embed vindo
  // como objeto, array ou null (ver comentário na função)
  const encomendasPendentes = pendenciasLista.filter(
    (p) =>
      p.tipo_venda === "encomenda" &&
      p.status === "entregue" &&
      !temAcertoRegistrado(p.encomenda_acertos)
  ).length;

  const pedidosRecentes = varejoDoMes.slice(0, 6);
  const producaoRecente = producoesLista.slice(0, 6);

  // o que exige ação hoje: cookie sem estoque nenhum ou perto de acabar.
  // Já vem ordenado do banco pelo menor estoque, então o mais urgente
  // aparece primeiro sem precisar reordenar aqui.
  const precisaAssar = (produtos ?? []).filter(
    (p) => p.qtd_estoque <= ESTOQUE_BAIXO
  );
  const zerados = precisaAssar.filter((p) => p.qtd_estoque <= 0).length;

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral de pedidos e produção." />

      <div className="mb-4">
        {/* SeletorMes usa useSearchParams, que exige um limite de Suspense */}
        <Suspense fallback={<div className="h-8" />}>
          <SeletorMes mes={mes} />
        </Suspense>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Pedidos recebidos"
          value={String(pedidosNovos)}
          icon={ClipboardList}
          hint="aguardando produção agora"
          href="/pedidos"
          tone={pedidosNovos > 0 ? "atencao" : "neutral"}
        />
        <StatTile
          label="Em produção"
          value={String(pedidosEmProducao)}
          icon={Factory}
          hint="pedidos na fila agora"
          href="/pedidos"
        />
        <StatTile
          label="Faturamento"
          value={`R$ ${faturamentoMes.toFixed(2)}`}
          icon={Wallet}
          hint="varejo, exclui cancelados"
        />
        <StatTile
          label="Cookies produzidos"
          value={cookiesMes.toLocaleString("pt-BR")}
          icon={Cookie}
          hint="no mês"
          href="/insumos/producao"
        />
      </div>

      {encomendasPendentes > 0 && (
        <div className="mb-4">
          <StatTile
            label="Encomendas a acertar"
            value={String(encomendasPendentes)}
            icon={PackageCheck}
            hint="entregues, aguardando acerto"
            href="/encomendas"
            tone="atencao"
          />
        </div>
      )}

      {precisaAssar.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 shrink-0 ${zerados > 0 ? "text-erro" : "text-atencao"}`}
                strokeWidth={1.75}
              />
              <h2 className="truncate text-sm font-semibold text-berinjela">
                Precisa assar
              </h2>
            </div>
            <Link
              href="/insumos/producao"
              className="shrink-0 text-xs text-neutro-500 underline underline-offset-2 hover:text-berinjela"
            >
              registrar produção
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {precisaAssar.map((produto) => (
              <span
                key={produto.id}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  produto.qtd_estoque <= 0
                    ? "bg-erro-bg text-erro-text"
                    : "bg-atencao-bg text-atencao-text"
                }`}
              >
                {produto.nome}
                <span className="opacity-70">
                  {produto.qtd_estoque <= 0 ? "esgotado" : produto.qtd_estoque}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-berinjela">
              Pedidos recentes
            </h2>
            <Link
              href="/pedidos"
              className="text-xs text-neutro-500 underline underline-offset-2 hover:text-berinjela"
            >
              ver todos
            </Link>
          </div>
          {pedidosRecentes.length ? (
            <div>
              {pedidosRecentes.map((pedido, i) => (
                <div
                  key={pedido.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-berinjela-50/60 ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-berinjela">
                      {pedido.clientes?.nome ?? "—"}
                    </p>
                    <p className="text-xs text-neutro-500">
                      {new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium text-berinjela">
                      R$ {Number(pedido.valor_total).toFixed(2)}
                    </span>
                    <Badge tone={STATUS_TONE[pedido.status]}>
                      {STATUS_LABEL[pedido.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-neutro-500">
              Nenhum pedido ainda.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-berinjela">
              Produção recente
            </h2>
            <Link
              href="/insumos/producao"
              className="text-xs text-neutro-500 underline underline-offset-2 hover:text-berinjela"
            >
              ver todas
            </Link>
          </div>
          {producaoRecente.length ? (
            <div>
              {producaoRecente.map((producao, i) => (
                <div
                  key={producao.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-berinjela-50/60 ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-berinjela">
                      {producao.produtos?.nome ?? producao.receitas?.nome ?? "—"}
                    </p>
                    <p className="text-xs text-neutro-500">
                      {new Date(producao.data).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-berinjela">
                    {producao.quantidade_produzida} cookies
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-neutro-500">
              Nenhuma produção registrada ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
