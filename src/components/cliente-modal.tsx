"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { InputTelefone } from "@/components/ui/input-telefone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarCliente, atualizarCliente } from "@/lib/actions/clientes";
import { telefoneValido } from "@/lib/telefone";

type ClienteExistente = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string | null;
};

export function ClienteModal({
  clienteExistente,
  trigger,
}: {
  clienteExistente?: ClienteExistente;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const formData = new FormData(e.currentTarget);

    if (!telefoneValido(String(formData.get("telefone") ?? ""))) {
      setErro("Telefone incompleto — precisa do DDD e 8 ou 9 dígitos.");
      return;
    }

    startTransition(async () => {
      try {
        if (clienteExistente) {
          await atualizarCliente(clienteExistente.id, formData);
          toast("Cliente salvo");
        } else {
          await criarCliente(formData);
          formRef.current?.reset();
          toast("Cliente criado");
        }
        setOpen(false);
      } catch (e) {
        // a action avisa quando o telefone já é de outro cliente
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível salvar."
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
          Novo cliente
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={clienteExistente ? "Editar cliente" : "Novo cliente"}
        maxWidth="max-w-md"
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup className="mb-6">
            <div>
              <Label htmlFor="cliente-nome">Nome</Label>
              <Input
                id="cliente-nome"
                name="nome"
                defaultValue={clienteExistente?.nome}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="cliente-telefone">Telefone</Label>
              <InputTelefone
                id="cliente-telefone"
                name="telefone"
                defaultValue={clienteExistente?.telefone}
                required
              />
              {clienteExistente && (
                <p className="mt-1 text-xs text-neutro-500">
                  É por ele que o cliente é reencontrado nos pedidos e no
                  cartão fidelidade.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="cliente-endereco">Endereço (opcional)</Label>
              <Input
                id="cliente-endereco"
                name="endereco"
                defaultValue={clienteExistente?.endereco ?? ""}
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
            <Button type="submit" loading={isPending}>
              {clienteExistente ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
