import Link from "next/link";
import { Package, Pencil, Plus, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { excluirInsumo } from "@/lib/actions/insumos";
import { InsumoModal } from "@/components/insumo-modal";
import { EntradaInsumoModal } from "@/components/entrada-insumo-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { UNIDADE_GRANDE } from "@/lib/unidade";
import { agruparPorCategoria } from "@/lib/categoria-insumo";
import { CategoriaCard } from "@/components/categoria-card";

export default async function InsumosPage() {
  const supabase = await createClient();
  const { data: insumos } = await supabase
    .from("insumos")
    .select("*")
    .order("nome", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Matéria-prima, estoque e custo médio por unidade."
        action={
          <>
            <Link href="/insumos/notas" className="flex-1 sm:flex-none">
              <Button variant="secondary" className="w-full">
                <Receipt className="h-4 w-4" strokeWidth={1.75} />
                Notas fiscais
              </Button>
            </Link>
            <InsumoModal
              trigger={
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Novo insumo
                </Button>
              }
            />
          </>
        }
      />

      {insumos?.length ? (
        <div className="space-y-3">
        {agruparPorCategoria(insumos).map((grupo) => (
        <CategoriaCard
          key={grupo.categoria}
          label={grupo.label}
          total={grupo.itens.length}
          alertas={
            grupo.itens.filter((i) => Number(i.estoque_atual) <= 0).length
          }
        >
        {/* mobile: lista de cards, sem tabela larga rolando de lado */}
        <div className="space-y-2 md:hidden">
          {grupo.itens.map((insumo) => (
            <div
              key={insumo.id}
              className="rounded-xl border border-border bg-white p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link
                  href={`/insumos/${insumo.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-berinjela"
                >
                  {insumo.nome}
                </Link>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    Number(insumo.estoque_atual) <= 0
                      ? "text-erro-text"
                      : "text-berinjela"
                  }`}
                >
                  {Number(insumo.estoque_atual).toLocaleString("pt-BR")}{" "}
                  {insumo.unidade_base}
                </span>
              </div>
              <p className="mb-3 text-xs text-neutro-500">
                R$ {Number(insumo.custo_medio_por_unidade).toFixed(2)} /{" "}
                {UNIDADE_GRANDE[insumo.unidade_base]} (médio) · R${" "}
                {Number(insumo.preco_atual).toFixed(2)} (última compra)
              </p>
              <div className="flex items-center gap-2 border-t border-border pt-2">
                <EntradaInsumoModal
                  insumo={insumo}
                  trigger={
                    <Button variant="secondary" className="min-h-11 flex-1">
                      <Plus className="h-4 w-4" strokeWidth={2} />
                      Entrada
                    </Button>
                  }
                />
                <InsumoModal
                  insumoExistente={insumo}
                  trigger={
                    <IconButton
                      aria-label={`Editar ${insumo.nome}`}
                      title="Editar"
                      size="toque"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </IconButton>
                  }
                />
                <ConfirmDeleteButton
                  itemName={insumo.nome}
                  size="toque"
                  onConfirm={excluirInsumo.bind(null, insumo.id)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          {/* sem <thead>: o cabeçalho se repetiria em cada categoria aberta
              e viraria ruído. As colunas já se explicam pelo formato. */}
          <table className="w-full text-sm">
            <tbody>
              {grupo.itens.map((insumo) => (
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
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      Number(insumo.estoque_atual) <= 0
                        ? "text-erro-text"
                        : "text-berinjela"
                    }`}
                  >
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
                      <span className="text-neutro-400">última</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutro-700">
                    R$ {Number(insumo.custo_medio_por_unidade).toFixed(2)} /{" "}
                    {UNIDADE_GRANDE[insumo.unidade_base]}{" "}
                    <span className="text-neutro-400">médio</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                      <EntradaInsumoModal
                        insumo={insumo}
                        trigger={
                          <IconButton
                            aria-label={`Registrar entrada de ${insumo.nome}`}
                            title="Registrar entrada (compra)"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2} />
                          </IconButton>
                        }
                      />
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
        </CategoriaCard>
        ))}
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
