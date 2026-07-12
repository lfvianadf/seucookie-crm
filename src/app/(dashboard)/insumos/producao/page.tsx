import { Factory } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProducaoModal } from "@/components/producao-modal";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ProducaoPage() {
  const supabase = await createClient();

  const [{ data: producoes }, { data: receitas }, { data: produtos }] =
    await Promise.all([
      supabase
        .from("producoes")
        .select("*, receitas(nome), produtos(nome)")
        .order("data", { ascending: false }),
      supabase
        .from("receitas")
        .select("id, nome, rendimento_cookies")
        .order("nome"),
      supabase.from("produtos").select("id, nome, receita_id").order("nome"),
    ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">Produção</h1>
          <p className="text-sm text-neutro-500">
            Cada fornada registrada desconta o estoque dos insumos usados.
          </p>
        </div>
        <ProducaoModal receitas={receitas ?? []} produtos={produtos ?? []} />
      </div>

      {producoes?.length ? (
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
              </tr>
            </thead>
            <tbody>
              {producoes.map((producao) => (
                <tr
                  key={producao.id}
                  className="border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 text-neutro-500">
                    {new Date(producao.data).toLocaleDateString("pt-BR")}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Factory}
          title="Nenhuma produção registrada ainda. Registre a primeira."
          action={
            <ProducaoModal receitas={receitas ?? []} produtos={produtos ?? []} />
          }
        />
      )}
    </div>
  );
}
