import Link from "next/link";
import { Factory, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { excluirProducao } from "@/lib/actions/producao";
import { ProducaoModal } from "@/components/producao-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Produções"
        description="Histórico de fornadas. Cada uma desconta o estoque dos insumos e repõe o estoque do produto."
        action={<ProducaoModal receitas={receitas ?? []} produtos={produtos ?? []} />}
      />

      {producoes?.length ? (
        <>
        <div className="space-y-2 md:hidden">
          {producoes.map((producao) => (
            <div
              key={producao.id}
              className="rounded-xl border border-border bg-white p-3"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-berinjela">
                  {producao.produtos?.nome ?? "—"}
                </p>
                <span className="shrink-0 text-sm font-semibold text-berinjela">
                  {producao.quantidade_produzida} un
                </span>
              </div>
              <p className="mb-3 text-xs text-neutro-500">
                {new Date(producao.data).toLocaleDateString("pt-BR")} ·{" "}
                {producao.receitas?.nome ?? "—"}
              </p>
              <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                <ProducaoModal
                  receitas={receitas ?? []}
                  produtos={produtos ?? []}
                  producaoExistente={producao}
                  trigger={
                    <IconButton
                      aria-label="Editar produção"
                      title="Editar"
                      size="toque"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </IconButton>
                  }
                />
                <ConfirmDeleteButton
                  itemName={`a produção de ${producao.quantidade_produzida} ${producao.produtos?.nome ?? "cookies"}`}
                  label="Produção"
                  size="toque"
                  onConfirm={excluirProducao.bind(null, producao.id)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border bg-white md:block">
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
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {producoes.map((producao) => (
                <tr
                  key={producao.id}
                  className="group border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 text-neutro-500">
                    {new Date(producao.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium text-berinjela">
                    <Link
                      href={`/insumos/producao/${producao.id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {producao.receitas?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutro-700">
                    {producao.produtos?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    {producao.quantidade_produzida}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <ProducaoModal
                        receitas={receitas ?? []}
                        produtos={produtos ?? []}
                        producaoExistente={producao}
                        trigger={
                          <IconButton aria-label="Editar produção" title="Editar">
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </IconButton>
                        }
                      />
                      <ConfirmDeleteButton
                        itemName={`a produção de ${producao.quantidade_produzida} ${producao.produtos?.nome ?? "cookies"}`}
                        label="Produção"
                        onConfirm={excluirProducao.bind(null, producao.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
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
