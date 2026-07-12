import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Factory } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

      <h1 className="mb-1 text-2xl font-semibold text-berinjela">{insumo.nome}</h1>
      <p className="mb-6 text-sm text-neutro-500">
        Estoque atual: {Number(insumo.estoque_atual).toLocaleString("pt-BR")}{" "}
        {insumo.unidade_base} · Custo médio: R${" "}
        {Number(insumo.custo_medio_por_unidade).toFixed(2)} /{" "}
        {UNIDADE_GRANDE[insumo.unidade_base]}
      </p>

      <h2 className="mb-3 text-sm font-semibold text-berinjela">
        Produções que usaram esse insumo
      </h2>
      <p className="mb-4 text-xs text-neutro-500">
        Calculado a partir da receita e do rendimento — se a receita mudou
        desde a produção, o valor aqui reflete a receita de hoje, não
        necessariamente o que foi descontado na hora.
      </p>

      {producoesComConsumo.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
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
