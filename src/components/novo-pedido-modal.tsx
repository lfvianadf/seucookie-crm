"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { NovoPedidoForm } from "@/components/novo-pedido-form";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  capitulo: string | null;
};

export function NovoPedidoModal({ produtos }: { produtos: Produto[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        Novo pedido
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo pedido"
        description="Telefone, itens, confirmar. O mais rápido possível."
        maxWidth="max-w-3xl"
      >
        <NovoPedidoForm
          produtos={produtos}
          onSuccess={() => {
            setOpen(false);
            toast("Pedido criado");
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
