import Image from "next/image";
import { Cookie, Package, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { excluirProduto } from "@/lib/actions/produtos";
import { ProdutoModal } from "@/components/produto-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { DisponibilidadeToggle } from "@/components/disponibilidade-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { calcularCustoReceita } from "@/lib/receita-custo";
import { ESTOQUE_BAIXO } from "@/lib/estoque";

export default async function ProdutosPage() {
  const supabase = await createClient();
  const [
    { data: produtos },
    { data: receitas },
    { data: receitaInsumos },
    { data: insumos },
    { data: boxItens },
  ] = await Promise.all([
    supabase
      .from("produtos")
      .select("*")
      .order("capitulo", { ascending: true })
      .order("nome", { ascending: true }),
    supabase.from("receitas").select("id, nome, rendimento_cookies").order("nome"),
    supabase.from("receita_insumos").select("*"),
    supabase.from("insumos").select("*"),
    supabase.from("produto_box_itens").select("box_id, cookie_id"),
  ]);

  const receitasLista = receitas ?? [];
  const receitaInsumosLista = receitaInsumos ?? [];
  const insumosLista = insumos ?? [];
  const produtosLista = produtos ?? [];
  const boxItensLista = boxItens ?? [];
  const cookiesLista = produtosLista
    .filter((p) => p.tipo_produto === "cookie")
    .map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <div>
      <PageHeader
        title="Cardápio"
        description="Fonte única do cardápio. O site só lê o que está disponível aqui."
        action={
          <ProdutoModal
            receitas={receitasLista}
            cookiesDisponiveis={cookiesLista}
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Novo produto
              </Button>
            }
          />
        }
      />

      {produtosLista.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {produtosLista.map((produto) => {
            const ehBox = produto.tipo_produto === "box";

            const cookieIdsDaBox = boxItensLista
              .filter((bi) => bi.box_id === produto.id)
              .map((bi) => bi.cookie_id);

            const estoqueExibido = ehBox
              ? cookieIdsDaBox.reduce((soma, cookieId) => {
                  const cookie = produtosLista.find((p) => p.id === cookieId);
                  return soma + (cookie?.qtd_estoque ?? 0);
                }, 0)
              : produto.qtd_estoque;

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
                      {ehBox ? (
                        <Package className="h-8 w-8" strokeWidth={1.5} />
                      ) : (
                        <Cookie className="h-8 w-8" strokeWidth={1.5} />
                      )}
                    </div>
                  )}
                  {ehBox && (
                    <span className="absolute left-2 top-2">
                      <Badge tone="neutral">Box</Badge>
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-berinjela">
                    {produto.nome}
                  </p>
                  <p className="mb-2.5 text-xs text-neutro-500">
                    {ehBox && produto.qtd_cookies_box
                      ? `${produto.qtd_cookies_box} cookies`
                      : (produto.capitulo ?? "—")}
                    {!ehBox && produto.acrescimo_box > 0
                      ? ` · +R$ ${Number(produto.acrescimo_box).toFixed(2)} em box`
                      : ""}
                    {produto.numero_receita ? ` · nº ${produto.numero_receita}` : ""}
                    {" · "}
                    <span
                      className={
                        estoqueExibido <= 0
                          ? "font-medium text-erro-text"
                          : estoqueExibido <= ESTOQUE_BAIXO
                            ? "font-medium text-atencao-text"
                            : undefined
                      }
                    >
                      {estoqueExibido} em estoque
                    </span>
                  </p>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-berinjela">
                      R$ {Number(produto.preco).toFixed(2)}
                    </span>
                    {ehBox ? (
                      <Badge tone={produto.disponivel ? "salvia" : "neutral"}>
                        {produto.disponivel ? "Disponível" : "Indisponível"}
                      </Badge>
                    ) : (
                      <DisponibilidadeToggle
                        id={produto.id}
                        disponivel={produto.disponivel}
                      />
                    )}
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
                      cookiesDisponiveis={cookiesLista}
                      produtoExistente={produto}
                      boxCookieIdsExistentes={cookieIdsDaBox}
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
              cookiesDisponiveis={cookiesLista}
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
