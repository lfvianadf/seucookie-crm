"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, Select, Textarea, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarProduto, atualizarProduto } from "@/lib/actions/produtos";

type Receita = { id: string; nome: string };

type ProdutoExistente = {
  id: string;
  nome: string;
  numero_receita: number | null;
  preco: number;
  capitulo: string | null;
  descricao: string | null;
  disponivel: boolean;
  qtd_estoque: number;
  foto_url: string | null;
  receita_id: string | null;
};

export function ProdutoModal({
  receitas,
  produtoExistente,
  trigger,
}: {
  receitas: Receita[];
  produtoExistente?: ProdutoExistente;
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
      if (produtoExistente) {
        await atualizarProduto(produtoExistente.id, formData);
      } else {
        await criarProduto(formData);
        formRef.current?.reset();
      }
      setOpen(false);
      toast(produtoExistente ? "Produto salvo" : "Produto criado");
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={produtoExistente ? "Editar produto" : "Novo produto"}
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup className="mb-6">
            {produtoExistente?.foto_url && (
              <div className="relative aspect-square w-24 overflow-hidden rounded-lg bg-neutro-100">
                <Image
                  src={produtoExistente.foto_url}
                  alt={produtoExistente.nome}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
            )}

            <div>
              <Label>
                Foto{" "}
                {produtoExistente?.foto_url && "(enviar nova substitui a atual)"}
              </Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2.5 text-sm text-neutro-500 transition-colors duration-150 hover:border-neutro-300">
                <Upload className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Escolher arquivo</span>
                <input type="file" name="foto" accept="image/*" className="hidden" />
              </label>
            </div>

            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={produtoExistente?.nome}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero_receita">Nº receita</Label>
                <Input
                  id="numero_receita"
                  name="numero_receita"
                  type="number"
                  defaultValue={produtoExistente?.numero_receita ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="preco">Preço</Label>
                <Input
                  id="preco"
                  name="preco"
                  type="number"
                  step="0.01"
                  defaultValue={produtoExistente?.preco}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capitulo">Capítulo</Label>
                <Input
                  id="capitulo"
                  name="capitulo"
                  defaultValue={produtoExistente?.capitulo ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="qtd_estoque">Estoque (cookies)</Label>
                <Input
                  id="qtd_estoque"
                  name="qtd_estoque"
                  type="number"
                  min={0}
                  defaultValue={produtoExistente?.qtd_estoque ?? 0}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="receita_id">Receita (ficha técnica)</Label>
              <Select
                id="receita_id"
                name="receita_id"
                defaultValue={produtoExistente?.receita_id ?? ""}
              >
                <option value="">Nenhuma</option>
                {receitas.map((receita) => (
                  <option key={receita.id} value={receita.id}>
                    {receita.nome}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                defaultValue={produtoExistente?.descricao ?? ""}
                rows={2}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-berinjela">
                <input
                  type="checkbox"
                  name="disponivel"
                  defaultChecked={produtoExistente?.disponivel ?? true}
                  className="h-4 w-4 accent-rosa"
                />
                Disponível no site
              </label>
              <p className="mt-1 text-xs text-neutro-500">
                Fica indisponível sozinho quando o estoque chega a 0 (cada
                pedido desconta a quantidade vendida).
              </p>
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
