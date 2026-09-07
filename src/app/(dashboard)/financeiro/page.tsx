import { Suspense } from "react";
import {
  Wallet,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Plus,
  Pencil,
  CircleSlash,
  TriangleAlert,
  Boxes,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { carregarFinanceiro } from "@/lib/financeiro";
import { mesAtual, mesDe, periodoDoMes, rotuloPeriodo } from "@/lib/competencia";
import { excluirPerda } from "@/lib/actions/perdas";
import { PerdaModal } from "@/components/perda-modal";
import { encerrarCustoMensal, excluirCustoMensal } from "@/lib/actions/financeiro";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { CustoMensalModal } from "@/components/custo-mensal-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

function reais(valor: number) {
  return `R$ ${valor.toFixed(2)}`;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const { inicio: inicioParam, fim: fimParam } = await searchParams;

  const periodoPadrao = periodoDoMes(mesAtual());
  const inicio = inicioParam ? new Date(`${inicioParam}T00:00:00`) : periodoPadrao.inicio;
  // fim vem da URL como o último dia incluído (inclusivo) — soma 1 dia pra
  // virar o limite exclusivo usado internamente, mesmo padrão de intervaloDoMes
  const fim = fimParam
    ? new Date(new Date(`${fimParam}T00:00:00`).getTime() + 24 * 60 * 60 * 1000)
    : periodoPadrao.fim;
  const periodo = { inicio, fim };

  // custo mensal ainda é lançado por mês de competência — período livre é só
  // leitura; o mês em que o período começa é a referência usada aqui
  const mesDeReferencia = mesDe(inicio);

  const supabase = await createClient();

  const [f, { data: perdas }, { data: produtos }] = await Promise.all([
    carregarFinanceiro(periodo),
    supabase
      .from("perdas")
      .select("id, quantidade, custo_unitario, motivo, data, produtos(nome)")
      .gte("data", inicio.toISOString())
      .lt("data", fim.toISOString())
      .order("data", { ascending: false }),
    supabase
      .from("produtos")
      .select("id, nome, qtd_estoque")
      .eq("tipo_produto", "cookie")
      .order("nome"),
  ]);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Vendas, custos e lucro do mês."
        action={
          <>
            <PerdaModal
              produtos={produtos ?? []}
              trigger={
                <Button variant="secondary" className="w-full sm:w-auto">
                  <TriangleAlert className="h-4 w-4" strokeWidth={1.75} />
                  Perda
                </Button>
              }
            />
            <CustoMensalModal
              mes={mesDeReferencia}
              trigger={
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Novo custo
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-4">
        {/* SeletorPeriodo usa useSearchParams, que exige um limite de Suspense */}
        <Suspense fallback={<div className="h-8" />}>
          <SeletorPeriodo periodo={periodo} />
        </Suspense>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Vendas"
          value={reais(f.vendas)}
          icon={Wallet}
          hint={`${f.pedidos} pedido${f.pedidos === 1 ? "" : "s"}, sem cancelados`}
        />
        <StatTile
          label="Custo do vendido"
          value={reais(f.custoDosVendidos)}
          icon={Receipt}
          hint={`margem bruta de ${f.margemBruta.toFixed(0)}%`}
        />
        <StatTile
          label="Custos fixos"
          value={reais(f.custosFixos)}
          icon={CircleSlash}
          hint="lançados neste mês"
        />
        <StatTile
          label="Perdas"
          value={reais(f.perdas)}
          icon={TriangleAlert}
          tone={f.perdas > 0 ? "atencao" : "neutral"}
          hint={`${f.cookiesPerdidos} cookie${f.cookiesPerdidos === 1 ? "" : "s"}, a custo de produção`}
        />
      </div>

      <div className="mb-4">
        <StatTile
          label="Lucro"
          value={reais(f.lucro)}
          icon={TrendingUp}
          tone={f.lucro < 0 ? "erro" : "neutral"}
          hint="vendas − custo do vendido − fixos − perdas"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="mb-3 text-xs font-medium text-neutro-500">Varejo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Vendas
              </p>
              <p className="text-lg font-semibold text-berinjela">
                {reais(f.varejo.vendas)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Custo
              </p>
              <p className="text-lg font-semibold text-berinjela">
                {reais(f.varejo.custoDosVendidos)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Lucro
              </p>
              <p className="text-lg font-semibold text-salvia-text">
                {reais(f.varejo.lucroBruto)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Margem
              </p>
              <p className="text-lg font-semibold text-salvia-text">
                {f.varejo.margemBruta.toFixed(0)}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutro-500">
            {f.varejo.pedidos} pedido{f.varejo.pedidos === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <p className="mb-3 text-xs font-medium text-neutro-500">Encomenda</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Vendas
              </p>
              <p className="text-lg font-semibold text-berinjela">
                {reais(f.encomenda.vendas)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Custo
              </p>
              <p className="text-lg font-semibold text-berinjela">
                {reais(f.encomenda.custoDosVendidos)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Lucro
              </p>
              <p className="text-lg font-semibold text-salvia-text">
                {reais(f.encomenda.lucroBruto)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                Margem
              </p>
              <p className="text-lg font-semibold text-salvia-text">
                {f.encomenda.margemBruta.toFixed(0)}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutro-500">
            {f.encomenda.pedidos} acerto{f.encomenda.pedidos === 1 ? "" : "s"} neste
            mês — <em>encomenda só vira faturamento quando é acertada</em>
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {f.aReceber.pedidos > 0 && (
          <a href="/encomendas" className="block">
            <div className="rounded-xl border border-atencao/40 bg-atencao-bg p-4 transition-shadow duration-150 hover:shadow-md">
              <p className="mb-1 text-xs font-medium text-atencao-text">
                A receber
              </p>
              <p className="text-xl font-semibold text-atencao-text">
                R$ {f.aReceber.valor.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-atencao-text">
                {f.aReceber.pedidos} encomenda{f.aReceber.pedidos === 1 ? "" : "s"}{" "}
                entregue{f.aReceber.pedidos === 1 ? "" : "s"} aguardando acerto —
                toque pra ver
              </p>
            </div>
          </a>
        )}

        {/* borda tracejada + fundo neutro em vez de uma cor nova: sinaliza
            "isso não é dinheiro fechado, é projeção" sem inventar um tom
            fora do sistema (vendas/lucro reais nunca somam este valor).
            Aparece sempre — sem encomenda pendente ela é igual às vendas
            normais, mas ainda serve de conferência rápida. */}
        <div className="rounded-xl border border-dashed border-border-strong bg-berinjela-50/40 p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-neutro-500" strokeWidth={1.75} />
            <p className="text-xs font-medium text-neutro-500">
              Faturamento estimado
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xl font-semibold text-berinjela">
                R$ {f.faturamentoEstimado.toFixed(2)}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                faturamento
              </p>
            </div>
            <div>
              <p
                className={`text-xl font-semibold ${f.lucroEstimado < 0 ? "text-erro-text" : "text-salvia-text"}`}
              >
                R$ {f.lucroEstimado.toFixed(2)}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                lucro
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutro-500">
            Vendas do período + TODA encomenda em aberto (programada,
            atrasada ou entregue) pelo valor cheio — projeção geral, não
            conta como resultado real até a encomenda ser acertada
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-4">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutro-500">
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Compras de insumo no mês (caixa)
          </p>
          <p className="text-xl font-semibold text-berinjela">
            {reais(f.comprasDeInsumo)}
          </p>
        </div>
        <p className="mt-2 text-xs text-neutro-500">
          Quanto saiu do bolso repondo estoque. Não entra no lucro acima — lá o
          que conta é o custo do que foi <em>vendido</em>. Um mês em que você
          estoca muito tem compra alta sem a margem ter piorado.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-neutro-500">
          <Boxes className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Cookies parados em estoque — hoje
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutro-500">
              Quantidade
            </p>
            <p className="text-xl font-semibold text-berinjela">
              {f.estoque.cookies.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutro-500">
              Custou
            </p>
            <p className="text-xl font-semibold text-berinjela">
              {reais(f.estoque.custo)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutro-500">
              Vale (venda)
            </p>
            <p className="text-xl font-semibold text-salvia-text">
              {reais(f.estoque.venda)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-neutro-500">
          Diferente dos números acima, esta é a foto de <em>agora</em>, não do
          mês escolhido — é o que está na prateleira. Só cookies: a box não tem
          estoque próprio, é montada na hora do pedido.
        </p>
      </div>

      {perdas && perdas.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-berinjela">
              Perdas de {rotuloPeriodo(periodo)}
            </h2>
            <span className="text-xs text-neutro-500">{reais(f.perdas)}</span>
          </div>
          <ul className="divide-y divide-border">
            {perdas.map((perda) => (
              <li key={perda.id} className="group flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-berinjela">
                    {perda.quantidade}x {perda.produtos?.nome ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-neutro-500">
                    {new Date(perda.data).toLocaleDateString("pt-BR")}
                    {perda.motivo ? ` · ${perda.motivo}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-atencao-text">
                  {reais(Number(perda.custo_unitario) * perda.quantidade)}
                </span>
                <div className="shrink-0 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <ConfirmDeleteButton
                    itemName={`a perda de ${perda.quantidade}x ${perda.produtos?.nome ?? "cookie"}`}
                    label="Perda"
                    onConfirm={excluirPerda.bind(null, perda.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-4 py-2.5 text-xs text-neutro-500">
            Excluir devolve os cookies ao estoque.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-berinjela">
            Custos de {rotuloPeriodo(periodo)}
          </h2>
          <span className="text-xs text-neutro-500">
            {reais(f.custosFixos)}
          </span>
        </div>

        {f.custos.length ? (
          <ul className="divide-y divide-border">
            {f.custos.map((custo) => (
              <li
                key={custo.id}
                className="group flex items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-berinjela">
                    {custo.descricao}
                  </p>
                  {custo.tipo === "parcelado" && custo.parcela && (
                    <p className="mt-0.5 text-xs text-neutro-500">
                      Parcela {custo.parcela.numero} de {custo.parcela.total}
                    </p>
                  )}
                  {custo.tipo === "recorrente" && (
                    <p className="mt-0.5 text-xs text-neutro-500">
                      {custo.herdado ? "Repetido de um mês anterior" : "Repete todo mês"}
                    </p>
                  )}
                </div>

                {custo.tipo === "recorrente" && <Badge tone="neutral">mensal</Badge>}
                {custo.tipo === "parcelado" && custo.parcela && (
                  <Badge tone="neutral">
                    {custo.parcela.numero}/{custo.parcela.total}
                  </Badge>
                )}
                {custo.fracaoDias < 1 && (
                  <span title={`Rateado: ${(custo.fracaoDias * 100).toFixed(0)}% de ${reais(custo.valorIntegral)}`}>
                    <Badge tone="atencao">
                      {(custo.fracaoDias * 100).toFixed(0)}%
                    </Badge>
                  </span>
                )}

                <span className="shrink-0 text-sm font-semibold text-berinjela">
                  {reais(custo.valor)}
                </span>

                <div className="flex shrink-0 items-center gap-1 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <CustoMensalModal
                    mes={mesDeReferencia}
                    custoExistente={custo}
                    trigger={
                      <IconButton
                        aria-label={`Editar ${custo.descricao}`}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </IconButton>
                    }
                  />
                  {custo.tipo === "recorrente" ? (
                    // encerrar em vez de excluir: para de repetir daqui pra
                    // frente sem apagar os meses em que o custo existiu
                    <form action={encerrarCustoMensal.bind(null, custo.id, mesDeReferencia)}>
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        title="Parar de repetir a partir deste mês"
                      >
                        Encerrar
                      </SubmitButton>
                    </form>
                  ) : (
                    <ConfirmDeleteButton
                      itemName={custo.descricao}
                      onConfirm={excluirCustoMensal.bind(null, custo.id)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-neutro-500">
            Nenhum custo lançado neste mês.
          </p>
        )}
      </div>
    </div>
  );
}
