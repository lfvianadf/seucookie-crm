import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ProducaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: producao } = await supabase
    .from("producoes")
    .select("*, receitas(nome, rendimento_cookies), produtos(nome)")
    .eq("id", id)
    .maybeSingle();

  if (!producao) notFound();

  const { data: receitaInsumos } = await supabase
    .from("receita_insumos")
    .select("quantidade, insumos(id, nome, unidade_base, custo_medio_por_unidade)")
    .eq("receita_id", producao.receita_id);

  const rendimento = producao.receitas?.rendimento_cookies ?? 0;
  const fator = rendimento > 0 ? producao.quantidade_produzida / rendimento : 0;

  const itensConsumidos = (receitaInsumos ?? []).map((ri) => {
    const quantidadeConsumida = ri.quantidade * fator;
    const fatorCusto = ri.insumos?.unidade_base === "un" ? 1 : 1000;
    const custoPorGramaOuMl = ri.insumos
      ? Number(ri.insumos.custo_medio_por_unidade) / fatorCusto
      : 0;
    return {
      ...ri,
      quantidadeConsumida,
      custoConsumido: quantidadeConsumida * custoPorGramaOuMl,
    };
  });

  const custoTotal = itensConsumidos.reduce((s, i) => s + i.custoConsumido, 0);

  return (
    <div>
      <Link
        href="/insumos/producao"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutro-500 transition-colors duration-150 hover:text-berinjela"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        Produção
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-berinjela">
        {producao.receitas?.nome ?? "Receita"}
      </h1>
      <p className="mb-6 text-sm text-neutro-500">
        {new Date(producao.data).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}{" "}
        · {producao.produtos?.nome ?? "—"} ·{" "}
        {producao.quantidade_produzida} cookies produzidos
      </p>

      <h2 className="mb-3 text-sm font-semibold text-berinjela">
        Insumos utilizados nessa produção
      </h2>
      <p className="mb-4 text-xs text-neutro-500">
        Calculado a partir da receita atual e do rendimento — não é um
        registro histórico congelado do que foi descontado na hora.
      </p>

      {itensConsumidos.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Insumo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Quantidade consumida
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Custo
                </th>
              </tr>
            </thead>
            <tbody>
              {itensConsumidos.map((item, i) => (
                <tr
                  key={item.insumos?.id ?? i}
                  className="border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 font-medium text-berinjela">
                    {item.insumos ? (
                      <Link
                        href={`/insumos/${item.insumos.id}`}
                        className="hover:underline underline-offset-2"
                      >
                        {item.insumos.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    {item.quantidadeConsumida.toLocaleString("pt-BR", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {item.insumos?.unidade_base}
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    R$ {item.custoConsumido.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="px-4 py-3 text-sm font-semibold text-berinjela">
                  Custo total da fornada
                </td>
                <td></td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-berinjela">
                  R$ {custoTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white px-6 py-12 text-center text-sm text-neutro-500">
          Essa receita não tem insumos cadastrados na ficha técnica.
        </div>
      )}
    </div>
  );
}
