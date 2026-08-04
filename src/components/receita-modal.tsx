"use client";

import { useState, useTransition } from "react";
import { X, AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, Select, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  criarReceita,
  atualizarReceita,
  type IngredienteReceita,
} from "@/lib/actions/receitas";
import { agruparPorCategoria } from "@/lib/categoria-insumo";
import type { UnidadeBase, CategoriaInsumo } from "@/lib/types/database";

type Insumo = {
  id: string;
  nome: string;
  unidade_base: UnidadeBase;
  categoria: CategoriaInsumo;
};

type ReceitaExistente = {
  id: string;
  nome: string;
  rendimento_cookies: number;
  itens: IngredienteReceita[];
};

export function ReceitaModal({
  insumos,
  receitaExistente,
  trigger,
  open: openControlado,
  onOpenChange,
}: {
  insumos: Insumo[];
  receitaExistente?: ReceitaExistente;
  trigger?: React.ReactNode;
  /** controlado por quem chama — usado quando outro modal precisa
   *  fechar antes deste abrir */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openInterno, setOpenInterno] = useState(false);
  const open = openControlado ?? openInterno;
  const setOpen = onOpenChange ?? setOpenInterno;
  const [nome, setNome] = useState(receitaExistente?.nome ?? "");
  const [rendimento, setRendimento] = useState(
    String(receitaExistente?.rendimento_cookies ?? "")
  );
  const [itens, setItens] = useState<IngredienteReceita[]>(
    receitaExistente?.itens ?? []
  );
  const [insumoSelecionado, setInsumoSelecionado] = useState("");
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const insumoUnidade = insumos.find((i) => i.id === insumoSelecionado)?.unidade_base;

  function adicionarItem() {
    if (!insumoSelecionado || !quantidadeSelecionada) return;
    const quantidade = Number(quantidadeSelecionada);
    if (Number.isNaN(quantidade) || quantidade <= 0) return;

    setItens((prev) => {
      const semEsse = prev.filter((i) => i.insumo_id !== insumoSelecionado);
      return [...semEsse, { insumo_id: insumoSelecionado, quantidade }];
    });
    setInsumoSelecionado("");
    setQuantidadeSelecionada("");
  }

  function removerItem(insumoId: string) {
    setItens((prev) => prev.filter((i) => i.insumo_id !== insumoId));
  }

  function handleSubmit() {
    setErro(null);
    const rendimentoNum = Number(rendimento);

    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (Number.isNaN(rendimentoNum) || rendimentoNum <= 0) {
      setErro("Rendimento deve ser maior que zero.");
      return;
    }
    if (itens.length === 0) {
      setErro("Adicione ao menos um insumo.");
      return;
    }

    startTransition(async () => {
      try {
        if (receitaExistente) {
          await atualizarReceita({
            id: receitaExistente.id,
            nome: nome.trim(),
            rendimento_cookies: rendimentoNum,
            itens,
          });
        } else {
          await criarReceita({
            nome: nome.trim(),
            rendimento_cookies: rendimentoNum,
            itens,
          });
        }
        setOpen(false);
        toast(receitaExistente ? "Receita salva" : "Receita criada");
        if (!receitaExistente) {
          setNome("");
          setRendimento("");
          setItens([]);
        }
      } catch {
        setErro("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <>
      {trigger && <span onClick={() => setOpen(true)}>{trigger}</span>}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={receitaExistente ? "Editar receita" : "Nova receita"}
        description="A ficha técnica: quanto de cada insumo entra e quantos cookies rende."
        maxWidth="max-w-xl"
      >
        <FieldGroup className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receita-nome">Nome</Label>
              <Input
                id="receita-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="receita-rendimento">Rendimento (cookies)</Label>
              <Input
                id="receita-rendimento"
                type="number"
                value={rendimento}
                onChange={(e) => setRendimento(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Insumos</Label>
            <div className="mb-2 flex gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  value={insumoSelecionado}
                  onChange={(e) => setInsumoSelecionado(e.target.value)}
                >
                  <option value="">Selecione o insumo</option>
                  {agruparPorCategoria(insumos).map((grupo) => (
                    <optgroup key={grupo.categoria} label={grupo.label}>
                      {grupo.itens.map((insumo) => (
                        <option key={insumo.id} value={insumo.id}>
                          {insumo.nome} ({insumo.unidade_base})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
              <div className="relative w-24 shrink-0">
                <Input
                  type="number"
                  step="0.001"
                  value={quantidadeSelecionada}
                  onChange={(e) => setQuantidadeSelecionada(e.target.value)}
                  placeholder="Qtd"
                  className={insumoUnidade ? "pr-9" : undefined}
                />
                {insumoUnidade && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutro-400">
                    {insumoUnidade}
                  </span>
                )}
              </div>
              <Button type="button" variant="secondary" onClick={adicionarItem}>
                Adicionar
              </Button>
            </div>

            {itens.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {itens.map((item) => {
                  const insumo = insumos.find((i) => i.id === item.insumo_id);
                  return (
                    <li
                      key={item.insumo_id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="text-berinjela">
                        {insumo?.nome ?? "?"}{" "}
                        <span className="text-neutro-500">
                          — {item.quantidade} {insumo?.unidade_base}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removerItem(item.insumo_id)}
                        aria-label={`Remover ${insumo?.nome}`}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutro-400 transition-colors duration-150 hover:bg-erro-bg hover:text-erro"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </FieldGroup>

        {erro && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-erro-bg px-3 py-2.5 text-sm text-erro-text">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {erro}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isPending}>
            Salvar receita
          </Button>
        </div>
      </Modal>
    </>
  );
}
