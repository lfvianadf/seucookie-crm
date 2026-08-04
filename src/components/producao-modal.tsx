"use client";

import { useState, useTransition } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, Select, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registrarProducao, atualizarProducao } from "@/lib/actions/producao";

type Receita = { id: string; nome: string; rendimento_cookies: number };
type Produto = { id: string; nome: string; receita_id: string | null };

type ProducaoExistente = {
  id: string;
  receita_id: string;
  produto_id: string;
  quantidade_produzida: number;
  data: string;
};

export function ProducaoModal({
  receitas,
  produtos,
  producaoExistente,
  trigger,
}: {
  receitas: Receita[];
  produtos: Produto[];
  producaoExistente?: ProducaoExistente;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [receitaId, setReceitaId] = useState(producaoExistente?.receita_id ?? "");
  const [produtoId, setProdutoId] = useState(producaoExistente?.produto_id ?? "");
  const [quantidade, setQuantidade] = useState(
    producaoExistente ? String(producaoExistente.quantidade_produzida) : ""
  );
  const [data, setData] = useState(
    (producaoExistente?.data ?? new Date().toISOString()).slice(0, 10)
  );
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function selecionarReceita(id: string) {
    setReceitaId(id);
    const produtoLigado = produtos.find((p) => p.receita_id === id);
    if (produtoLigado) setProdutoId(produtoLigado.id);
  }

  function handleSubmit() {
    setErro(null);
    const qtd = Number(quantidade);

    if (!receitaId) {
      setErro("Selecione a receita usada.");
      return;
    }
    if (!produtoId) {
      setErro("Selecione o produto produzido.");
      return;
    }
    if (Number.isNaN(qtd) || qtd <= 0) {
      setErro("Quantidade inválida.");
      return;
    }

    startTransition(async () => {
      try {
        if (producaoExistente) {
          await atualizarProducao({
            producaoId: producaoExistente.id,
            receitaId,
            produtoId,
            quantidade: qtd,
            data: data ? new Date(data).toISOString() : undefined,
          });
          setOpen(false);
          toast("Produção atualizada, estoque recalculado");
          return;
        }

        await registrarProducao({
          receitaId,
          produtoId,
          quantidade: qtd,
          data: data ? new Date(data).toISOString() : undefined,
        });
        setOpen(false);
        setReceitaId("");
        setProdutoId("");
        setQuantidade("");
        toast("Produção registrada, estoque atualizado");
      } catch (e) {
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível salvar. Confira o estoque e tente de novo."
        );
      }
    });
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Registrar produção
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={producaoExistente ? "Editar produção" : "Registrar produção"}
        description={
          producaoExistente
            ? "Ao salvar, o estoque da fornada antiga é estornado e o novo é aplicado."
            : "Baixa o estoque dos insumos automaticamente, proporcional à receita."
        }
      >
        <FieldGroup className="mb-6">
          <div>
            <Label htmlFor="producao-receita">Receita</Label>
            <Select
              id="producao-receita"
              value={receitaId}
              onChange={(e) => selecionarReceita(e.target.value)}
              autoFocus
            >
              <option value="">Selecione</option>
              {receitas.map((receita) => (
                <option key={receita.id} value={receita.id}>
                  {receita.nome} (rende {receita.rendimento_cookies})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="producao-produto">Produto</Label>
            <Select
              id="producao-produto"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">Selecione</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="producao-quantidade">Cookies produzidos</Label>
              <Input
                id="producao-quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="producao-data">Data</Label>
              <Input
                id="producao-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
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
            {producaoExistente ? "Salvar alterações" : "Registrar e baixar estoque"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
