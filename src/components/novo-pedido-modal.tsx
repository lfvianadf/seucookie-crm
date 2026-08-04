"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { NovoPedidoForm } from "@/components/novo-pedido-form";
import type { TipoProduto } from "@/lib/types/database";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  capitulo: string | null;
  tipo_produto: TipoProduto;
  qtd_cookies_box: number | null;
};

type BoxCookies = Record<
  string,
  { id: string; nome: string; preco: number; acrescimo_box: number }[]
>;

export function NovoPedidoModal({
  produtos,
  boxCookies,
}: {
  produtos: Produto[];
  boxCookies: BoxCookies;
}) {
  const [open, setOpen] = useState(false);
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
          boxCookies={boxCookies}
          onSuccess={() => {
            setOpen(false);
            toast("Pedido criado");
          }}
        />
      </Modal>
    </>
  );
}
