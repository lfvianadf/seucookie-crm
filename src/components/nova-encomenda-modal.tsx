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

export function NovaEncomendaModal({
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
        Nova encomenda
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova encomenda"
        description="Preço de atacado, combinado com data de entrega."
        maxWidth="max-w-3xl"
      >
        <NovoPedidoForm
          produtos={produtos}
          boxCookies={boxCookies}
          tipoVenda="encomenda"
          onSuccess={() => {
            setOpen(false);
            toast("Encomenda criada");
          }}
        />
      </Modal>
    </>
  );
}
