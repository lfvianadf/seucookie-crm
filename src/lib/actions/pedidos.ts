"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encontrarOuCriarCliente } from "@/lib/actions/clientes";
import type { PedidoStatus } from "@/lib/types/database";

export type ItemCarrinho = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  // só pra itens tipo_produto = 'box': quais cookies (e quantas unidades de
  // cada) foram escolhidos pra ir dentro dessa box especificamente. É isso
  // que desconta o estoque de verdade — a box em si não tem estoque próprio.
  composicao?: { cookieProdutoId: string; quantidade: number }[];
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

  // insere um a um (não em lote) porque itens de box precisam do id do
  // pedido_item recém-criado pra gravar a composição em seguida.
  for (const item of itens) {
    const { data: pedidoItem, error: itemError } = await supabase
      .from("pedido_itens")
      .insert({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      })
      .select("id")
      .single();

    if (itemError) throw itemError;

    if (item.composicao && item.composicao.length > 0) {
      const { error: composicaoError } = await supabase
        .from("pedido_item_composicao")
        .insert(
          item.composicao.map((c) => ({
            pedido_item_id: pedidoItem.id,
            cookie_produto_id: c.cookieProdutoId,
            quantidade: c.quantidade,
          }))
        );
      if (composicaoError) throw composicaoError;
    }
  }

  revalidatePath("/pedidos");
}

export async function atualizarStatusPedido(id: string, status: PedidoStatus) {
  const supabase = await createClient();
  await supabase.from("pedidos").update({ status }).eq("id", id);
  revalidatePath("/pedidos");
}

export async function atualizarPedido(params: {
  pedidoId: string;
  itens: (ItemCarrinho & { id?: string })[];
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

  // reconcilia por id do item (não por produto_id) — um pedido pode ter
  // duas boxes com o mesmo produto_id e composições diferentes, então
  // produto_id não identifica um item de forma única. Boxes não são
  // editáveis aqui (composição fica intocada); só cookies podem ser
  // adicionados/alterados/removidos na edição.
  const idsAtuais = new Set((itensAtuais ?? []).map((i) => i.id));
  const idsNovos = new Set(itens.filter((i) => i.id).map((i) => i.id));

  const paraRemover = (itensAtuais ?? []).filter((i) => !idsNovos.has(i.id));
  const paraInserir = itens.filter((i) => !i.id);
  const paraAtualizar = itens.filter((i) => i.id && idsAtuais.has(i.id));

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
    const existente = (itensAtuais ?? []).find((i) => i.id === item.id)!;
    if (
      existente.quantidade !== item.quantidade ||
      existente.preco_unitario !== item.preco_unitario
    ) {
      const { error } = await supabase
        .from("pedido_itens")
        .update({ quantidade: item.quantidade, preco_unitario: item.preco_unitario })
        .eq("id", item.id!);
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
