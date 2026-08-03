"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/modal";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { criarCliente } from "@/lib/actions/clientes";

export function NovoClienteModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await criarCliente(formData);
      setOpen(false);
      formRef.current?.reset();
      toast("Cliente criado");
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        Novo cliente
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo cliente">
        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup className="mb-6">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required autoFocus />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                required
                inputMode="tel"
                placeholder="(11) 90000-0000"
              />
            </div>
            <div>
              <Label htmlFor="endereco">Endereço (opcional)</Label>
              <Input id="endereco" name="endereco" />
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
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
