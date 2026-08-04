"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { Label, Input, Select, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarInsumo, atualizarInsumo } from "@/lib/actions/insumos";
import { UNIDADE_GRANDE } from "@/lib/unidade";
import {
  CATEGORIA_ORDEM,
  CATEGORIA_LABEL,
  CATEGORIA_HINT,
} from "@/lib/categoria-insumo";
import type { UnidadeBase, CategoriaInsumo } from "@/lib/types/database";

type InsumoExistente = {
  id: string;
  nome: string;
  unidade_base: UnidadeBase;
  categoria: CategoriaInsumo;
  estoque_atual: number;
  custo_medio_por_unidade: number;
};

export function InsumoModal({
  insumoExistente,
  trigger,
}: {
  insumoExistente?: InsumoExistente;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaInsumo>(
    insumoExistente?.categoria ?? "outros"
  );
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (insumoExistente) {
        await atualizarInsumo(insumoExistente.id, formData);
      } else {
        await criarInsumo(formData);
        formRef.current?.reset();
      }
      setOpen(false);
      toast(insumoExistente ? "Insumo salvo" : "Insumo criado");
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={insumoExistente ? "Editar insumo" : "Novo insumo"}
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup className="mb-6">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={insumoExistente?.nome}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  id="categoria"
                  name="categoria"
                  required
                  value={categoria}
                  onChange={(e) =>
                    setCategoria(e.target.value as CategoriaInsumo)
                  }
                >
                  {CATEGORIA_ORDEM.map((valor) => (
                    <option key={valor} value={valor}>
                      {CATEGORIA_LABEL[valor]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="unidade_base">Unidade</Label>
                <Select
                  id="unidade_base"
                  name="unidade_base"
                  required
                  defaultValue={insumoExistente?.unidade_base ?? ""}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="un">un</option>
                </Select>
              </div>
            </div>
            <p className="-mt-2 text-xs text-neutro-500">
              {CATEGORIA_HINT[categoria]}
            </p>

            {/* estoque e custo não são mais editáveis: os dois saem dos
                lotes de compra. Digitar um valor aqui criaria um número que
                não corresponde a nenhuma entrada real e o próximo
                lançamento sobrescreveria de qualquer jeito. */}
            {insumoExistente && (
              <div className="rounded-lg bg-berinjela-50 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-neutro-500">Estoque atual</span>
                  <span className="text-sm font-medium text-berinjela">
                    {Number(insumoExistente.estoque_atual).toLocaleString("pt-BR")}{" "}
                    {insumoExistente.unidade_base}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="text-xs text-neutro-500">Custo médio</span>
                  <span className="text-sm font-medium text-berinjela">
                    R$ {Number(insumoExistente.custo_medio_por_unidade).toFixed(2)}{" "}
                    / {UNIDADE_GRANDE[insumoExistente.unidade_base]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutro-500">
                  Calculados a partir das entradas de compra que ainda têm
                  saldo. Para alterar, registre uma entrada.
                </p>
              </div>
            )}
          </FieldGroup>

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
