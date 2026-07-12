"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encontrarOuCriarCliente } from "@/lib/actions/clientes";
import type { PedidoStatus } from "@/lib/types/database";

export type ItemCarrinho = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
};

export async function criarPedidoManual(params: {
  clienteNome: string;
  clienteTelefone: string;
  clienteEndereco?: string;
  itens: ItemCarrinho[];
  observacoes?: string;
}) {
  const { clienteNome, clienteTelefone, clienteEndereco, itens, observacoes } =
    params;

  if (!clienteNome || !clienteTelefone || itens.length === 0) {
    throw new Error("Cliente e ao menos um item são obrigatórios.");
  }

  const supabase = await createClient();
  const cliente = await encontrarOuCriarCliente(
    clienteNome,
    clienteTelefone,
    clienteEndereco
  );

  const valorTotal = itens.reduce(
    (soma, item) => soma + item.quantidade * item.preco_unitario,
    0
  );

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: cliente.id,
      origem: "manual",
      status: "novo",
      valor_total: valorTotal,
      observacoes: observacoes || null,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: itensError } = await supabase.from("pedido_itens").insert(
    itens.map((item) => ({
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    }))
  );

  if (itensError) throw itensError;

  revalidatePath("/pedidos");
}

export async function atualizarStatusPedido(id: string, status: PedidoStatus) {
  const supabase = await createClient();
  await supabase.from("pedidos").update({ status }).eq("id", id);
  revalidatePath("/pedidos");
}
