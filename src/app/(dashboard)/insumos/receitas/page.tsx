import { ClipboardList, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { excluirReceita } from "@/lib/actions/receitas";
import { ReceitaModal } from "@/components/receita-modal";
import { ReceitaCard } from "@/components/receita-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
    const {
      custoReceita,
      custoPorCookie,
      cookiesPossiveis,
      gargaloInsumoId,
      detalhamento,
    } = calcularCustoReceita(receita, receitaInsumosLista, insumosLista);

    return {
      ...receita,
      custoReceita,
      custoPorCookie,
      cookiesPossiveis,
      detalhamento,
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
      <PageHeader
        title="Receitas"
        description="Ficha técnica: custo por cookie e quanto dá pra fazer com o estoque de hoje."
        action={
          <ReceitaModal
            insumos={insumosLista}
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Nova receita
              </Button>
            }
          />
        }
      />

      {receitasComCalculo.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {receitasComCalculo.map((receita) => (
            <ReceitaCard
              key={receita.id}
              receita={receita}
              insumos={insumosLista}
              onExcluir={excluirReceita.bind(null, receita.id)}
            />
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
