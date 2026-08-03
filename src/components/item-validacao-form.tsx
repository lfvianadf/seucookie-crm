"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  validarItemNota,
  criarInsumoRapido,
  excluirItemNota,
} from "@/lib/actions/notas";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { useToast } from "@/components/ui/toast";
import type { UnidadeBase } from "@/lib/types/database";

type Insumo = { id: string; nome: string; unidade_base: UnidadeBase };

type Item = {
  id: string;
  nota_id: string;
  texto_original: string;
  insumo_id: string | null;
  quantidade: number;
  valor: number;
  validado: boolean;
};

export function ItemValidacaoForm({
  item,
  insumosIniciais,
}: {
  item: Item;
  insumosIniciais: Insumo[];
}) {
  const [insumos, setInsumos] = useState(insumosIniciais);
  const [insumoId, setInsumoId] = useState(item.insumo_id ?? "");
  const [quantidade, setQuantidade] = useState(String(item.quantidade));
  const [valor, setValor] = useState(String(item.valor));
  const [criandoInsumo, setCriandoInsumo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaUnidade, setNovaUnidade] = useState<UnidadeBase>("g");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [criandoPending, startCriarTransition] = useTransition();
  const toast = useToast();

  const insumoSelecionado = insumos.find((i) => i.id === insumoId);

  function handleCriarInsumo() {
    if (!novoNome.trim()) return;
    startCriarTransition(async () => {
      const insumo = await criarInsumoRapido(novoNome.trim(), novaUnidade);
      setInsumos((prev) => [...prev, insumo]);
      setInsumoId(insumo.id);
      setCriandoInsumo(false);
      setNovoNome("");
    });
  }

  function handleConfirmar() {
    setErro(null);
    const qtd = Number(quantidade);
    const val = Number(valor);

    if (!insumoId) {
      setErro("Selecione ou crie um insumo.");
      return;
    }
    if (Number.isNaN(qtd) || qtd <= 0) {
      setErro("Quantidade inválida.");
      return;
    }
    if (Number.isNaN(val) || val < 0) {
      setErro("Valor inválido.");
      return;
    }

    startTransition(async () => {
      try {
        await validarItemNota({
          itemId: item.id,
          notaId: item.nota_id,
          insumoId,
          quantidade: qtd,
          valor: val,
          textoOriginal: item.texto_original,
        });
        toast("Item validado, estoque atualizado");
      } catch {
        setErro("Não foi possível confirmar. Tente novamente.");
      }
    });
  }

  if (item.validado) {
    const insumoValidado = insumos.find((i) => i.id === item.insumo_id);
    return (
      <div className="flex items-center gap-3 rounded-xl bg-salvia-bg px-4 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-salvia" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-berinjela">
            {item.texto_original}
            {insumoValidado && (
              <span className="font-normal text-neutro-500">
                {" "}
                ({insumoValidado.nome}, {item.quantidade} {insumoValidado.unidade_base})
              </span>
            )}
          </p>
          <p className="text-xs text-salvia-text">Validado</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-berinjela">
          R$ {Number(item.valor).toFixed(2)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-berinjela">
          {item.texto_original}
        </p>
        <ConfirmDeleteButton
          itemName={item.texto_original}
          onConfirm={excluirItemNota.bind(null, item.id, item.nota_id)}
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-2">
          {!criandoInsumo ? (
            <Select
              value={insumoId}
              onChange={(e) => {
                if (e.target.value === "__novo__") {
                  setCriandoInsumo(true);
                } else {
                  setInsumoId(e.target.value);
                }
              }}
            >
              <option value="">Selecione o insumo</option>
              {insumos.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nome} ({insumo.unidade_base})
                </option>
              ))}
              <option value="__novo__">+ Criar novo insumo</option>
            </Select>
          ) : (
            <div className="flex gap-2">
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome do insumo"
                autoFocus
              />
              <Select
                value={novaUnidade}
                onChange={(e) => setNovaUnidade(e.target.value as UnidadeBase)}
                className="w-20"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="un">un</option>
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCriarInsumo}
                loading={criandoPending}
              >
                Criar
              </Button>
            </div>
          )}
        </div>
        <div className="relative">
          <Input
            type="number"
            step="0.001"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Quantidade"
            className={insumoSelecionado ? "pr-9" : undefined}
          />
          {insumoSelecionado && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutro-400">
              {insumoSelecionado.unidade_base}
            </span>
          )}
        </div>
        <Input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor (R$)"
        />
      </div>

      {erro && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-erro-bg px-3 py-2 text-xs text-erro-text">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {erro}
        </div>
      )}

      <Button onClick={handleConfirmar} loading={isPending} size="sm">
        Confirmar item
      </Button>
    </div>
  );
}
