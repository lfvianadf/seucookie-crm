import Link from "next/link";
import { ClipboardList, Factory, Wallet, Cookie } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/pedido-status";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: pedidos }, { data: producoes }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, status, valor_total, data_pedido, clientes(nome)")
      .order("data_pedido", { ascending: false }),
    supabase
      .from("producoes")
      .select("id, quantidade_produzida, data, receitas(nome), produtos(nome)")
      .order("data", { ascending: false }),
  ]);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const pedidosLista = pedidos ?? [];
  const producoesLista = producoes ?? [];

  const pedidosNovos = pedidosLista.filter((p) => p.status === "novo").length;
  const pedidosEmProducao = pedidosLista.filter(
    (p) => p.status === "em_producao"
  ).length;

  const faturamentoMes = pedidosLista
    .filter(
      (p) => new Date(p.data_pedido) >= inicioMes && p.status !== "cancelado"
    )
    .reduce((soma, p) => soma + Number(p.valor_total), 0);

  const cookiesMes = producoesLista
    .filter((p) => new Date(p.data) >= inicioMes)
    .reduce((soma, p) => soma + p.quantidade_produzida, 0);

  const pedidosRecentes = pedidosLista.slice(0, 6);
  const producaoRecente = producoesLista.slice(0, 6);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-berinjela">Dashboard</h1>
      <p className="mb-6 text-sm text-neutro-500">
        Visão geral de pedidos e produção.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Pedidos recebidos"
          value={String(pedidosNovos)}
          icon={ClipboardList}
          hint="aguardando produção"
        />
        <StatTile
          label="Em produção"
          value={String(pedidosEmProducao)}
          icon={Factory}
          hint="pedidos na fila"
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
        />
      </div>

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
