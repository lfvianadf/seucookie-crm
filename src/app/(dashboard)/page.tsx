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
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";
import { ESTOQUE_BAIXO } from "@/lib/estoque";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: pedidos }, { data: producoes }, { data: produtos }] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("id, status, tipo_venda, valor_total, data_pedido, clientes(nome)")
        .order("data_pedido", { ascending: false }),
      supabase
        .from("producoes")
        .select("id, quantidade_produzida, data, receitas(nome), produtos(nome)")
        .order("data", { ascending: false }),
      supabase
        .from("produtos")
        .select("id, nome, qtd_estoque, tipo_produto")
        .eq("tipo_produto", "cookie")
        .order("qtd_estoque", { ascending: true }),
    ]);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const pedidosLista = pedidos ?? [];
  const producoesLista = producoes ?? [];

  // dashboard mostra varejo — encomenda tem tela própria (/encomendas) e
  // não vira faturamento na entrega, só no acerto
  const varejoLista = pedidosLista.filter((p) => p.tipo_venda === "varejo");
  const encomendasLista = pedidosLista.filter((p) => p.tipo_venda === "encomenda");

  const pedidosNovos = varejoLista.filter((p) => p.status === "novo").length;
  const pedidosEmProducao = varejoLista.filter(
    (p) => p.status === "em_producao"
  ).length;

  const faturamentoMes = varejoLista
    .filter(
      (p) => new Date(p.data_pedido) >= inicioMes && p.status !== "cancelado"
    )
    .reduce((soma, p) => soma + Number(p.valor_total), 0);

  const cookiesMes = producoesLista
    .filter((p) => new Date(p.data) >= inicioMes)
    .reduce((soma, p) => soma + p.quantidade_produzida, 0);

  // sem acerto ainda (fase 3 do plano de encomendas): por ora, toda
  // encomenda entregue está "pendente" — vira contável quando o ciclo de
  // acerto existir
  const encomendasPendentes = encomendasLista.filter(
    (p) => p.status === "entregue"
  ).length;

  const pedidosRecentes = varejoLista.slice(0, 6);
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Pedidos recebidos"
          value={String(pedidosNovos)}
          icon={ClipboardList}
          hint="aguardando produção"
          href="/pedidos"
          tone={pedidosNovos > 0 ? "atencao" : "neutral"}
        />
        <StatTile
          label="Em produção"
          value={String(pedidosEmProducao)}
          icon={Factory}
          hint="pedidos na fila"
          href="/pedidos"
        />
        <StatTile
          label="Faturamento do mês"
          value={`R$ ${faturamentoMes.toFixed(2)}`}
          icon={Wallet}
          hint="exclui cancelados"
        />
        <StatTile
          label="Cookies produzidos"
          value={cookiesMes.toLocaleString("pt-BR")}
          icon={Cookie}
          hint="neste mês"
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
