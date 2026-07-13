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

export async function atualizarPedido(params: {
  pedidoId: string;
  itens: ItemCarrinho[];
  observacoes?: string;
}) {
  const { pedidoId, itens, observacoes } = params;

  if (itens.length === 0) {
    throw new Error("O pedido precisa de ao menos um item.");
  }

  const supabase = await createClient();

  const { data: itensAtuais, error: itensAtuaisError } = await supabase
    .from("pedido_itens")
    .select("id, produto_id, quantidade, preco_unitario")
    .eq("pedido_id", pedidoId);

  if (itensAtuaisError) throw itensAtuaisError;

  const valorTotal = itens.reduce(
    (soma, item) => soma + item.quantidade * item.preco_unitario,
    0
  );

  const { error: updateError } = await supabase
    .from("pedidos")
    .update({ valor_total: valorTotal, observacoes: observacoes || null })
    .eq("id", pedidoId);

  if (updateError) throw updateError;

  // reconcilia item a item (não apaga tudo e reinsere) — o estoque reage a
  // cada insert/update/delete individualmente via trigger, então só tocar
  // no que realmente mudou evita descontar/devolver estoque à toa.
  const existentesPorProduto = new Map(
    (itensAtuais ?? []).map((i) => [i.produto_id, i])
  );
  const novosPorProduto = new Map(itens.map((i) => [i.produto_id, i]));

  const paraRemover = (itensAtuais ?? []).filter(
    (i) => !novosPorProduto.has(i.produto_id)
  );
  const paraInserir = itens.filter((i) => !existentesPorProduto.has(i.produto_id));
  const paraAtualizar = itens.filter((i) => existentesPorProduto.has(i.produto_id));

  if (paraRemover.length > 0) {
    const { error } = await supabase
      .from("pedido_itens")
      .delete()
      .in(
        "id",
        paraRemover.map((i) => i.id)
      );
    if (error) throw error;
  }

  for (const item of paraAtualizar) {
    const existente = existentesPorProduto.get(item.produto_id)!;
    if (
      existente.quantidade !== item.quantidade ||
      existente.preco_unitario !== item.preco_unitario
    ) {
      const { error } = await supabase
        .from("pedido_itens")
        .update({ quantidade: item.quantidade, preco_unitario: item.preco_unitario })
        .eq("id", existente.id);
      if (error) throw error;
    }
  }

  if (paraInserir.length > 0) {
    const { error } = await supabase.from("pedido_itens").insert(
      paraInserir.map((item) => ({
        pedido_id: pedidoId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      }))
    );
    if (error) throw error;
  }

  revalidatePath("/pedidos");
}

export async function excluirPedido(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/pedidos");
}
