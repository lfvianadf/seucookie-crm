"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, Select, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registrarPerda } from "@/lib/actions/perdas";

type Produto = { id: string; nome: string; qtd_estoque: number };

export function PerdaModal({
  produtos,
  trigger,
}: {
  produtos: Produto[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const produto = produtos.find((p) => p.id === produtoId);

  function handleSubmit() {
    setErro(null);
    const qtd = Number(quantidade);

    if (!produtoId) {
      setErro("Selecione o produto perdido.");
      return;
    }
    if (Number.isNaN(qtd) || qtd <= 0) {
      setErro("Quantidade inválida.");
      return;
    }

    startTransition(async () => {
      try {
        await registrarPerda({
          produtoId,
          quantidade: qtd,
          motivo,
          data: data ? new Date(data).toISOString() : undefined,
        });
        setOpen(false);
        setProdutoId("");
        setQuantidade("");
        setMotivo("");
        toast("Perda registrada, estoque ajustado");
      } catch (e) {
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível registrar."
        );
      }
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar perda"
        description="Cookie que queimou, caiu ou passou do ponto. Sai do estoque e abate do lucro pelo custo de produção."
        maxWidth="max-w-md"
      >
        <FieldGroup className="mb-6">
          <div>
            <Label htmlFor="perda-produto">Produto</Label>
            <Select
              id="perda-produto"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              autoFocus
            >
              <option value="">Selecione</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.qtd_estoque} em estoque)
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="perda-quantidade">Quantidade perdida</Label>
              <Input
                id="perda-quantidade"
                type="number"
                min={1}
                inputMode="numeric"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
              {produto && Number(quantidade) > produto.qtd_estoque && (
                <p className="mt-1 text-xs text-atencao-text">
                  Maior que o estoque ({produto.qtd_estoque}). O estoque vai
                  parar em zero.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="perda-data">Data</Label>
              <Input
                id="perda-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="perda-motivo">Motivo (opcional)</Label>
            <Input
              id="perda-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="ex: queimou, caiu no chão, passou do ponto"
            />
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
            Registrar perda
          </Button>
        </div>
      </Modal>
    </>
  );
}
