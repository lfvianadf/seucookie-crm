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
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { carregarFinanceiro } from "@/lib/financeiro";
import { intervaloDoMes } from "@/lib/competencia";
import { excluirPerda } from "@/lib/actions/perdas";
import { PerdaModal } from "@/components/perda-modal";
import { mesAtual, rotuloMes } from "@/lib/competencia";
import { encerrarCustoMensal, excluirCustoMensal } from "@/lib/actions/financeiro";
import { SeletorMes } from "@/components/seletor-mes";
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
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam ?? mesAtual();
  const { inicio, fim } = intervaloDoMes(mes);
  const supabase = await createClient();

  const [f, { data: perdas }, { data: produtos }] = await Promise.all([
    carregarFinanceiro(mes),
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
              mes={mes}
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
        {/* SeletorMes usa useSearchParams, que exige um limite de Suspense */}
        <Suspense fallback={<div className="h-8" />}>
          <SeletorMes mes={mes} />
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
          <div className="grid grid-cols-3 gap-2">
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
          <div className="grid grid-cols-3 gap-2">
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
                Margem
              </p>
              <p className="text-lg font-semibold text-salvia-text">
                {f.encomenda.margemBruta.toFixed(0)}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutro-500">
            {f.encomenda.pedidos} encomenda{f.encomenda.pedidos === 1 ? "" : "s"} —{" "}
            <em>conta na entrega por ora; o ciclo de acerto ainda não existe</em>
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
              Perdas de {rotuloMes(mes)}
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
            Custos de {rotuloMes(mes)}
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

                <span className="shrink-0 text-sm font-semibold text-berinjela">
                  {reais(custo.valor)}
                </span>

                <div className="flex shrink-0 items-center gap-1 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <CustoMensalModal
                    mes={mes}
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
                    <form action={encerrarCustoMensal.bind(null, custo.id, mes)}>
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
