import { ClipboardList, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { excluirReceita } from "@/lib/actions/receitas";
import { ReceitaModal } from "@/components/receita-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { calcularCustoReceita } from "@/lib/receita-custo";

export default async function ReceitasPage() {
  const supabase = await createClient();

  const [{ data: receitas }, { data: receitaInsumos }, { data: insumos }] =
    await Promise.all([
      supabase.from("receitas").select("*").order("nome"),
      supabase.from("receita_insumos").select("*"),
      supabase.from("insumos").select("*").order("nome"),
    ]);

  const insumosLista = insumos ?? [];
  const receitaInsumosLista = receitaInsumos ?? [];

  const receitasComCalculo = (receitas ?? []).map((receita) => {
    const { custoPorCookie, cookiesPossiveis, gargaloInsumoId } =
      calcularCustoReceita(receita, receitaInsumosLista, insumosLista);

    return {
      ...receita,
      custoPorCookie,
      cookiesPossiveis,
      gargaloInsumo: insumosLista.find((i) => i.id === gargaloInsumoId)?.nome ?? null,
      itens: receitaInsumosLista
        .filter((ri) => ri.receita_id === receita.id)
        .map((ri) => ({
          insumo_id: ri.insumo_id,
          quantidade: ri.quantidade,
        })),
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">Receitas</h1>
          <p className="text-sm text-neutro-500">
            Ficha técnica: custo por cookie e quanto dá pra fazer com o
            estoque de hoje.
          </p>
        </div>
        <ReceitaModal
          insumos={insumosLista}
          trigger={
            <Button>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nova receita
            </Button>
          }
        />
      </div>

      {receitasComCalculo.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {receitasComCalculo.map((receita) => (
            <div
              key={receita.id}
              className="group rounded-xl border border-border bg-white p-4 transition-shadow duration-150 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-berinjela">
                    {receita.nome}
                  </p>
                  <p className="text-xs text-neutro-500">
                    Rende {receita.rendimento_cookies} cookies
                  </p>
                </div>
                <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <ReceitaModal
                    insumos={insumosLista}
                    receitaExistente={{
                      id: receita.id,
                      nome: receita.nome,
                      rendimento_cookies: receita.rendimento_cookies,
                      itens: receita.itens,
                    }}
                    trigger={
                      <IconButton
                        aria-label={`Editar ${receita.nome}`}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </IconButton>
                    }
                  />
                  <ConfirmDeleteButton
                    itemName={receita.nome}
                    onConfirm={excluirReceita.bind(null, receita.id)}
                  />
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-berinjela-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                    Custo/cookie
                  </p>
                  <p className="text-sm font-semibold text-berinjela">
                    R$ {receita.custoPorCookie.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-berinjela-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutro-500">
                    Dá pra fazer
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      receita.cookiesPossiveis === 0
                        ? "text-erro-text"
                        : "text-salvia-text"
                    }`}
                  >
                    {receita.cookiesPossiveis} cookies
                  </p>
                </div>
              </div>

              {receita.gargaloInsumo && receita.cookiesPossiveis === 0 && (
                <p className="text-xs text-erro-text">
                  Gargalo: falta {receita.gargaloInsumo}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma receita ainda. Crie a primeira."
          action={
            <ReceitaModal
              insumos={insumosLista}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Nova receita
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
