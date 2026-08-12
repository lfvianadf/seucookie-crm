import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Factory, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EntradaInsumoModal } from "@/components/entrada-insumo-modal";
import { LoteModal } from "@/components/lote-modal";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { UNIDADE_GRANDE } from "@/lib/unidade";

export default async function InsumoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: insumo } = await supabase
    .from("insumos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!insumo) notFound();

  const { data: lotes } = await supabase
    .from("insumo_lotes")
    .select("id, quantidade, quantidade_restante, preco_unitario, data")
    .eq("insumo_id", id)
    .order("data", { ascending: false });

  const { data: receitaInsumos } = await supabase
    .from("receita_insumos")
    .select("receita_id, quantidade, receitas(nome, rendimento_cookies)")
    .eq("insumo_id", id);

  const receitaIds = (receitaInsumos ?? []).map((ri) => ri.receita_id);

  const { data: producoes } =
    receitaIds.length > 0
      ? await supabase
          .from("producoes")
          .select("id, quantidade_produzida, data, receita_id, receitas(nome), produtos(nome)")
          .in("receita_id", receitaIds)
          .order("data", { ascending: false })
      : { data: [] };

  const producoesComConsumo = (producoes ?? []).map((producao) => {
    const ri = receitaInsumos?.find((r) => r.receita_id === producao.receita_id);
    const rendimento = ri?.receitas?.rendimento_cookies ?? 0;
    const fator = rendimento > 0 ? producao.quantidade_produzida / rendimento : 0;
    const quantidadeConsumida = (ri?.quantidade ?? 0) * fator;
    return { ...producao, quantidadeConsumida };
  });

  return (
    <div>
      <Link
        href="/insumos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutro-500 transition-colors duration-150 hover:text-berinjela"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        Insumos
      </Link>

      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-berinjela">{insumo.nome}</h1>
        <EntradaInsumoModal
          insumo={insumo}
          trigger={
            <Button variant="secondary" className="min-h-11">
              <Plus className="h-4 w-4" strokeWidth={2} />
              Entrada
            </Button>
          }
        />
      </div>
      <p className="mb-6 text-sm text-neutro-500">
        Estoque atual: {Number(insumo.estoque_atual).toLocaleString("pt-BR")}{" "}
        {insumo.unidade_base} · Custo médio: R${" "}
        {Number(insumo.custo_medio_por_unidade).toFixed(2)} /{" "}
        {UNIDADE_GRANDE[insumo.unidade_base]}
      </p>

      <h2 className="mb-3 text-sm font-semibold text-berinjela">
        Entradas de compra
      </h2>
      <p className="mb-3 text-xs text-neutro-500">
        O custo médio sai da média ponderada dos lotes que ainda têm saldo —
        lote esgotado deixa de contar. O consumo baixa sempre do mais antigo
        primeiro.
      </p>

      {lotes?.length ? (
        <div className="mb-8 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[32rem] text-sm">
            <tbody>
              {lotes.map((lote) => {
                const esgotado = Number(lote.quantidade_restante) <= 0;
                return (
                  <tr
                    key={lote.id}
                    className={`border-b border-border last:border-0 ${
                      esgotado ? "text-neutro-400" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {new Date(lote.data).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {/* lote guarda por unidade base (grama/ml); a tela
                          sempre mostra por kg/L */}
                      R${" "}
                      {(
                        Number(lote.preco_unitario) *
                        (insumo.unidade_base === "un" ? 1 : 1000)
                      ).toFixed(2)}{" "}
                      / {UNIDADE_GRANDE[insumo.unidade_base]}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {Number(lote.quantidade).toLocaleString("pt-BR")}{" "}
                      {insumo.unidade_base} comprados
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {esgotado ? (
                        <span className="text-neutro-400">esgotado</span>
                      ) : (
                        <span className="text-berinjela">
                          restam{" "}
                          {Number(lote.quantidade_restante).toLocaleString("pt-BR")}{" "}
                          {insumo.unidade_base}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <LoteModal
                          lote={lote}
                          insumoId={insumo.id}
                          unidadeBase={insumo.unidade_base}
                          trigger={
                            <IconButton
                              aria-label="Corrigir entrada"
                              title="Corrigir entrada"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.75} />
                            </IconButton>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-8 rounded-xl border border-border bg-white px-4 py-8 text-center text-sm text-neutro-500">
          Nenhuma entrada registrada. Use o botão &ldquo;Entrada&rdquo; pra
          lançar a primeira compra.
        </p>
      )}

      <h2 className="mb-3 text-sm font-semibold text-berinjela">
        Produções que usaram esse insumo
      </h2>
      <p className="mb-4 text-xs text-neutro-500">
        Calculado a partir da receita e do rendimento — se a receita mudou
        desde a produção, o valor aqui reflete a receita de hoje, não
        necessariamente o que foi descontado na hora.
      </p>

      {producoesComConsumo.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Data
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Receita
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Produto
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Cookies produzidos
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  {insumo.nome} consumido
                </th>
              </tr>
            </thead>
            <tbody>
              {producoesComConsumo.map((producao) => (
                <tr
                  key={producao.id}
                  className="border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 text-neutro-500">
                    <Link
                      href={`/insumos/producao/${producao.id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {new Date(producao.data).toLocaleDateString("pt-BR")}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-berinjela">
                    {producao.receitas?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutro-700">
                    {producao.produtos?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    {producao.quantidade_produzida}
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    {producao.quantidadeConsumida.toLocaleString("pt-BR", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {insumo.unidade_base}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-berinjela-50 text-neutro-500">
            <Factory className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-neutro-500">
            Nenhuma produção usou esse insumo ainda.
          </p>
        </div>
      )}
    </div>
  );
}
