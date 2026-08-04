"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ReceitaModal } from "@/components/receita-modal";
import { ReceitaCustoModal } from "@/components/receita-custo-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { IconButton } from "@/components/ui/icon-button";
import type { ItemCusto } from "@/lib/receita-custo";
import type { IngredienteReceita } from "@/lib/actions/receitas";
import type { UnidadeBase } from "@/lib/types/database";

type Insumo = { id: string; nome: string; unidade_base: UnidadeBase };

type Receita = {
  id: string;
  nome: string;
  rendimento_cookies: number;
  custoReceita: number;
  custoPorCookie: number;
  cookiesPossiveis: number;
  gargaloInsumo: string | null;
  itens: IngredienteReceita[];
  detalhamento: ItemCusto[];
};

export function ReceitaCard({
  receita,
  insumos,
  onExcluir,
}: {
  receita: Receita;
  insumos: Insumo[];
  onExcluir: () => Promise<void>;
}) {
  // os três modais são controlados aqui pra que abrir um feche o outro —
  // no mobile editar/excluir saem de dentro do modal de custo, e empilhar
  // duas camadas de modal deixa a saída confusa.
  const [custoAberto, setCustoAberto] = useState(false);
  const [edicaoAberta, setEdicaoAberta] = useState(false);
  const [exclusaoAberta, setExclusaoAberta] = useState(false);

  function abrirEdicao() {
    setCustoAberto(false);
    setEdicaoAberta(true);
  }

  function abrirExclusao() {
    setCustoAberto(false);
    setExclusaoAberta(true);
  }

  return (
    <div className="group rounded-xl border border-border bg-white p-4 transition-shadow duration-150 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-berinjela">
            {receita.nome}
          </p>
          <p className="text-xs text-neutro-500">
            Rende {receita.rendimento_cookies} cookies
          </p>
        </div>
        {/* no mobile essas ações moram dentro do modal de custo — aqui elas
            dependem de hover, que não existe no toque */}
        <div className="-mr-1.5 -mt-1.5 hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 md:flex">
          <IconButton
            aria-label={`Editar ${receita.nome}`}
            title="Editar"
            onClick={abrirEdicao}
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            tone="destructive"
            aria-label={`Excluir ${receita.nome}`}
            title="Excluir"
            onClick={abrirExclusao}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      <ReceitaCustoModal
        open={custoAberto}
        onOpenChange={setCustoAberto}
        nome={receita.nome}
        rendimento={receita.rendimento_cookies}
        custoReceita={receita.custoReceita}
        custoPorCookie={receita.custoPorCookie}
        cookiesPossiveis={receita.cookiesPossiveis}
        itens={receita.detalhamento}
        acoes={
          <>
            <IconButton
              aria-label={`Editar ${receita.nome}`}
              title="Editar"
              size="toque"
              onClick={abrirEdicao}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
            </IconButton>
            <IconButton
              tone="destructive"
              aria-label={`Excluir ${receita.nome}`}
              title="Excluir"
              size="toque"
              onClick={abrirExclusao}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </IconButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-2">
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
          <p className="mt-3 text-xs text-erro-text">
            Gargalo: falta {receita.gargaloInsumo}
          </p>
        )}

        <p className="mt-3 text-xs text-neutro-400">
          Toque pra ver o custo item a item
        </p>
      </ReceitaCustoModal>

      <ReceitaModal
        insumos={insumos}
        open={edicaoAberta}
        onOpenChange={setEdicaoAberta}
        receitaExistente={{
          id: receita.id,
          nome: receita.nome,
          rendimento_cookies: receita.rendimento_cookies,
          itens: receita.itens,
        }}
      />

      <ConfirmDeleteButton
        semBotao
        open={exclusaoAberta}
        onOpenChange={setExclusaoAberta}
        itemName={receita.nome}
        onConfirm={onExcluir}
      />
    </div>
  );
}
