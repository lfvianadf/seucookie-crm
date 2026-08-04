"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, Select, Textarea, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarProduto, atualizarProduto } from "@/lib/actions/produtos";
import type { TipoProduto } from "@/lib/types/database";

type Receita = { id: string; nome: string };
type CookieOpcao = { id: string; nome: string };

type ProdutoExistente = {
  id: string;
  nome: string;
  numero_receita: number | null;
  preco: number;
  capitulo: string | null;
  descricao: string | null;
  disponivel: boolean;
  qtd_estoque: number;
  tipo_produto: TipoProduto;
  qtd_cookies_box: number | null;
  acrescimo_box: number;
  foto_url: string | null;
  receita_id: string | null;
};

export function ProdutoModal({
  receitas,
  cookiesDisponiveis,
  produtoExistente,
  boxCookieIdsExistentes,
  trigger,
}: {
  receitas: Receita[];
  cookiesDisponiveis: CookieOpcao[];
  produtoExistente?: ProdutoExistente;
  boxCookieIdsExistentes?: string[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [tipoProduto, setTipoProduto] = useState<TipoProduto>(
    produtoExistente?.tipo_produto ?? "cookie"
  );
  const [cookiesSelecionados, setCookiesSelecionados] = useState<Set<string>>(
    new Set(boxCookieIdsExistentes ?? [])
  );
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function alternarCookie(id: string) {
    setCookiesSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (produtoExistente) {
        await atualizarProduto(produtoExistente.id, formData);
      } else {
        await criarProduto(formData);
        formRef.current?.reset();
        setCookiesSelecionados(new Set());
      }
      setOpen(false);
      toast(produtoExistente ? "Produto salvo" : "Produto criado");
    });
  }

  const ehBox = tipoProduto === "box";

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

            <div>
              <Label htmlFor="tipo_produto">Tipo</Label>
              <Select
                id="tipo_produto"
                name="tipo_produto"
                value={tipoProduto}
                onChange={(e) => setTipoProduto(e.target.value as TipoProduto)}
              >
                <option value="cookie">Cookie</option>
                <option value="box">Box (caixa sortida)</option>
              </Select>
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
                <Label htmlFor="preco">{ehBox ? "Preço base" : "Preço"}</Label>
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

            {ehBox ? (
              <div>
                <Label htmlFor="qtd_cookies_box">Cookies por caixa</Label>
                <Input
                  id="qtd_cookies_box"
                  name="qtd_cookies_box"
                  type="number"
                  min={1}
                  defaultValue={produtoExistente?.qtd_cookies_box ?? ""}
                  placeholder="ex: 4"
                />
                <p className="mt-1 text-xs text-neutro-500">
                  O pedido só aceita a box com exatamente essa quantidade.
                  Deixe vazio pra permitir qualquer combinação.
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="acrescimo_box">Acréscimo em box (R$)</Label>
                <Input
                  id="acrescimo_box"
                  name="acrescimo_box"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={produtoExistente?.acrescimo_box ?? 0}
                />
                <p className="mt-1 text-xs text-neutro-500">
                  Quanto esse sabor soma ao preço da box, por unidade. Deixe 0
                  se ele não encarece a caixa.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capitulo">Seção do cardápio</Label>
                <Input
                  id="capitulo"
                  name="capitulo"
                  defaultValue={produtoExistente?.capitulo ?? ""}
                />
              </div>
              {!ehBox && (
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
              )}
            </div>

            {ehBox && (
              <div>
                <Label>Cookies que podem ir dentro dessa box</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border-strong p-2">
                  {cookiesDisponiveis.length === 0 && (
                    <p className="px-1 py-1 text-xs text-neutro-500">
                      Nenhum cookie cadastrado ainda.
                    </p>
                  )}
                  {cookiesDisponiveis.map((cookie) => (
                    <label
                      key={cookie.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-berinjela hover:bg-berinjela-50"
                    >
                      <input
                        type="checkbox"
                        name="box_cookies"
                        value={cookie.id}
                        checked={cookiesSelecionados.has(cookie.id)}
                        onChange={() => alternarCookie(cookie.id)}
                        className="h-4 w-4 accent-rosa"
                      />
                      {cookie.nome}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-neutro-500">
                  O estoque e a disponibilidade da box são calculados a
                  partir desses cookies — não dá pra editar manualmente.
                </p>
              </div>
            )}

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
                  disabled={ehBox}
                />
                Disponível no site
              </label>
              <p className="mt-1 text-xs text-neutro-500">
                {ehBox
                  ? "Pra box, isso é automático: fica disponível enquanto algum dos cookies selecionados tiver estoque."
                  : "Fica indisponível sozinho quando o estoque chega a 0 (cada pedido desconta a quantidade vendida)."}
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
