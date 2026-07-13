import Image from "next/image";
import { Cookie, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { excluirProduto } from "@/lib/actions/produtos";
import { ProdutoModal } from "@/components/produto-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { DisponibilidadeToggle } from "@/components/disponibilidade-toggle";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { calcularCustoReceita } from "@/lib/receita-custo";

export default async function ProdutosPage() {
  const supabase = await createClient();
  const [
    { data: produtos },
    { data: receitas },
    { data: receitaInsumos },
    { data: insumos },
  ] = await Promise.all([
    supabase
      .from("produtos")
      .select("*")
      .order("capitulo", { ascending: true })
      .order("nome", { ascending: true }),
    supabase.from("receitas").select("id, nome, rendimento_cookies").order("nome"),
    supabase.from("receita_insumos").select("*"),
    supabase.from("insumos").select("*"),
  ]);

  const receitasLista = receitas ?? [];
  const receitaInsumosLista = receitaInsumos ?? [];
  const insumosLista = insumos ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">Cardápio</h1>
          <p className="text-sm text-neutro-500">
            Fonte única do cardápio. O site só lê o que está disponível aqui.
          </p>
        </div>
        <ProdutoModal
          receitas={receitasLista}
          trigger={
            <Button>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Novo produto
            </Button>
          }
        />
      </div>

      {produtos?.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {produtos.map((produto) => {
            const receita = produto.receita_id
              ? receitasLista.find((r) => r.id === produto.receita_id)
              : null;
            const { custoPorCookie } = receita
              ? calcularCustoReceita(receita, receitaInsumosLista, insumosLista)
              : { custoPorCookie: 0 };
            const preco = Number(produto.preco);
            const margem = receita ? preco - custoPorCookie : null;
            const margemPercent =
              margem !== null && preco > 0 ? (margem / preco) * 100 : null;

            return (
            <div
              key={produto.id}
              className="overflow-hidden rounded-xl border border-border bg-white transition-shadow duration-150 hover:shadow-md"
            >
              <div className="relative aspect-square w-full bg-berinjela-50">
                {produto.foto_url ? (
                  <Image
                    src={produto.foto_url}
                    alt={produto.nome}
                    fill
                    sizes="(max-width: 640px) 50vw, 220px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutro-300">
                    <Cookie className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-berinjela">
                  {produto.nome}
                </p>
                <p className="mb-2.5 text-xs text-neutro-500">
                  {produto.capitulo ?? "—"}
                  {produto.numero_receita ? ` · nº ${produto.numero_receita}` : ""}
                  {" · "}
                  <span
                    className={
                      produto.qtd_estoque <= 0 ? "font-medium text-erro-text" : undefined
                    }
                  >
                    {produto.qtd_estoque} em estoque
                  </span>
                </p>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-berinjela">
                    R$ {Number(produto.preco).toFixed(2)}
                  </span>
                  <DisponibilidadeToggle
                    id={produto.id}
                    disponivel={produto.disponivel}
                  />
                </div>
                {margem !== null && (
                  <p
                    className={`mb-3 text-xs font-medium ${
                      margem >= 0 ? "text-salvia-text" : "text-erro-text"
                    }`}
                  >
                    Margem R$ {margem.toFixed(2)}
                    {margemPercent !== null && ` (${margemPercent.toFixed(0)}%)`}
                  </p>
                )}
                <div className="-mx-1 flex items-center justify-end gap-0.5 border-t border-border pt-2">
                  <ProdutoModal
                    receitas={receitasLista}
                    produtoExistente={produto}
                    trigger={
                      <IconButton aria-label={`Editar ${produto.nome}`} title="Editar">
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </IconButton>
                    }
                  />
                  <ConfirmDeleteButton
                    itemName={produto.nome}
                    onConfirm={excluirProduto.bind(null, produto.id)}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Cookie}
          title="Nenhum produto ainda. Crie o primeiro."
          action={
            <ProdutoModal
              receitas={receitasLista}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Novo produto
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
