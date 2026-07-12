"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { Label, Input, Select, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarInsumo, atualizarInsumo } from "@/lib/actions/insumos";
import type { UnidadeBase } from "@/lib/types/database";

type InsumoExistente = {
  id: string;
  nome: string;
  unidade_base: UnidadeBase;
  estoque_atual: number;
  custo_medio_por_unidade: number;
  preco_atual: number;
};

export function InsumoModal({
  insumoExistente,
  trigger,
}: {
  insumoExistente?: InsumoExistente;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
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
      router.refresh();
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

            <div>
              <Label htmlFor="estoque_atual">Estoque atual</Label>
              <Input
                id="estoque_atual"
                name="estoque_atual"
                type="number"
                step="0.001"
                defaultValue={insumoExistente?.estoque_atual ?? 0}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preco_atual">Preço atual (kg/L/un)</Label>
                <Input
                  id="preco_atual"
                  name="preco_atual"
                  type="number"
                  step="0.01"
                  defaultValue={insumoExistente?.preco_atual ?? 0}
                />
              </div>
              <div>
                <Label htmlFor="custo_medio_por_unidade">
                  Custo médio (kg/L/un)
                </Label>
                <Input
                  id="custo_medio_por_unidade"
                  name="custo_medio_por_unidade"
                  type="number"
                  step="0.01"
                  defaultValue={insumoExistente?.custo_medio_por_unidade ?? 0}
                />
              </div>
            </div>
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
