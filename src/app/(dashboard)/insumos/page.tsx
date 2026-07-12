import Link from "next/link";
import { Package, Pencil, Plus, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { excluirInsumo } from "@/lib/actions/insumos";
import { InsumoModal } from "@/components/insumo-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { UNIDADE_GRANDE } from "@/lib/unidade";

export default async function InsumosPage() {
  const supabase = await createClient();
  const { data: insumos } = await supabase
    .from("insumos")
    .select("*")
    .order("nome", { ascending: true });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">Insumos</h1>
          <p className="text-sm text-neutro-500">
            Matéria-prima, estoque e custo médio por unidade.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/insumos/notas">
            <Button variant="secondary">
              <Receipt className="h-4 w-4" strokeWidth={1.75} />
              Notas fiscais
            </Button>
          </Link>
          <InsumoModal
            trigger={
              <Button>
                <Plus className="h-4 w-4" strokeWidth={2} />
                Novo insumo
              </Button>
            }
          />
        </div>
      </div>

      <p className="mb-6 text-xs text-neutro-500">
        Estoque e custo médio são atualizados a partir das{" "}
        <Link href="/insumos/notas" className="underline underline-offset-2">
          notas fiscais
        </Link>{" "}
        confirmadas.
      </p>

      {insumos?.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Nome
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Unidade
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Estoque atual
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Preço atual
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Custo médio
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((insumo) => (
                <tr
                  key={insumo.id}
                  className="group border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 font-medium text-berinjela">
                    <Link
                      href={`/insumos/${insumo.id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {insumo.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutro-500">{insumo.unidade_base}</td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    {Number(insumo.estoque_atual).toLocaleString("pt-BR")}{" "}
                    {insumo.unidade_base}
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    <span className="inline-flex items-center gap-1 justify-end">
                      {insumo.preco_atual > insumo.custo_medio_por_unidade && (
                        <TrendingUp className="h-3.5 w-3.5 text-erro" strokeWidth={1.75} />
                      )}
                      {insumo.preco_atual < insumo.custo_medio_por_unidade &&
                        insumo.preco_atual > 0 && (
                          <TrendingDown className="h-3.5 w-3.5 text-salvia" strokeWidth={1.75} />
                        )}
                      R$ {Number(insumo.preco_atual).toFixed(2)} /{" "}
                      {UNIDADE_GRANDE[insumo.unidade_base]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    R$ {Number(insumo.custo_medio_por_unidade).toFixed(2)} /{" "}
                    {UNIDADE_GRANDE[insumo.unidade_base]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                      <InsumoModal
                        insumoExistente={insumo}
                        trigger={
                          <IconButton
                            aria-label={`Editar ${insumo.nome}`}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </IconButton>
                        }
                      />
                      <ConfirmDeleteButton
                        itemName={insumo.nome}
                        onConfirm={excluirInsumo.bind(null, insumo.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="Nenhum insumo ainda. Crie o primeiro."
          action={
            <InsumoModal
              trigger={
                <Button>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Novo insumo
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
