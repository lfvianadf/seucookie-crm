"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { temAcertoRegistrado } from "@/lib/encomenda";
import { encontrarOuCriarCliente } from "@/lib/actions/clientes";
import type { PedidoOrigem, PedidoStatus, PedidoTipoVenda } from "@/lib/types/database";

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
  tipoVenda?: PedidoTipoVenda;
  dataEntregaPrevista?: string;
  origem?: PedidoOrigem;
  valorLiquidoRecebido?: number | null;
}) {
  const {
    clienteNome,
    clienteTelefone,
    clienteEndereco,
    itens,
    observacoes,
    tipoVenda = "varejo",
    dataEntregaPrevista,
    origem = "manual",
    valorLiquidoRecebido,
  } = params;

  if (!clienteNome || !clienteTelefone || itens.length === 0) {
    throw new Error("Cliente e ao menos um item são obrigatórios.");
  }

  const supabase = await createClient();
  const cliente = await encontrarOuCriarCliente(
    clienteNome,
    clienteTelefone,
    clienteEndereco
  );

  const { data: pedidoId, error } = await supabase.rpc("criar_pedido_crm", {
    p_cliente_id: cliente.id, p_itens: itens,
    p_observacoes: observacoes ?? null, p_tipo_venda: tipoVenda,
    p_data_entrega: dataEntregaPrevista ?? null, p_origem: origem,
    p_valor_liquido: valorLiquidoRecebido ?? null,
  });
  if (error) throw error;
  const { data: pedido, error: leituraError } = await supabase.from("pedidos").select().eq("id", pedidoId).single();
  if (leituraError) throw new Error(`Pedido ${pedidoId} criado, mas não foi possível ler os detalhes. Consulte-o antes de repetir.`);

  revalidatePath(tipoVenda === "encomenda" ? "/encomendas" : "/pedidos");
  revalidatePath("/");

  return pedido;
}

/**
 * Wrapper fino sobre criarPedidoManual — evita duplicar a lógica de
 * composição de box só pra fixar tipoVenda='encomenda'.
 */
export async function criarEncomenda(params: {
  clienteNome: string;
  clienteTelefone: string;
  clienteEndereco?: string;
  itens: ItemCarrinho[];
  observacoes?: string;
  dataEntregaPrevista?: string;
}) {
  return criarPedidoManual({ ...params, tipoVenda: "encomenda" });
}

export async function atualizarStatusPedido(id: string, status: PedidoStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .update({ status })
    .eq("id", id)
    .select("tipo_venda")
    .single();
  if (error) throw error;
  revalidatePath(data?.tipo_venda === "encomenda" ? "/encomendas" : "/pedidos");
  revalidatePath("/");
}

export async function atualizarPedido(params: {
  pedidoId: string;
  itens: (ItemCarrinho & { id?: string })[];
  observacoes?: string;
  dataEntregaPrevista?: string | null;
}) {
  const { pedidoId, itens, observacoes, dataEntregaPrevista } = params;

  if (itens.length === 0) {
    throw new Error("O pedido precisa de ao menos um item.");
  }

  for (const item of itens) {
    if (!Number.isInteger(item.quantidade) || item.quantidade <= 0 || !Number.isFinite(item.preco_unitario) || item.preco_unitario < 0) {
      throw new Error("Quantidade ou preço inválido.");
    }
  }
  const supabase = await createClient();

  const { data: itensAtuais, error: itensAtuaisError } = await supabase
    .from("pedido_itens")
    .select("id, produto_id, quantidade, preco_unitario")
    .eq("pedido_id", pedidoId);

  if (itensAtuaisError) throw itensAtuaisError;

  const idsRecebidos = itens.flatMap((item) => item.id ? [item.id] : []);
  if (new Set(idsRecebidos).size !== idsRecebidos.length) throw new Error("Um item não pode aparecer duas vezes na edição.");
  for (const item of itens.filter((i) => i.id)) {
    const atual = itensAtuais?.find((i) => i.id === item.id);
    if (!atual || atual.produto_id !== item.produto_id) throw new Error("O item não pertence ao pedido ou teve seu produto alterado.");
  }

  const valorTotal = itens.reduce(
    (soma, item) => soma + item.quantidade * item.preco_unitario,
    0
  );

  const dadosAtualizados: {
    valor_total: number;
    observacoes: string | null;
    data_entrega_prevista?: string | null;
  } = {
    valor_total: valorTotal,
    observacoes: observacoes || null,
  };
  // undefined = campo não fazia parte da edição (pedido de varejo não tem
  // data de entrega); null explícito, se algum dia usado, limparia a data
  if (dataEntregaPrevista !== undefined) {
    dadosAtualizados.data_entrega_prevista = dataEntregaPrevista;
  }

  const { error: updateError } = await supabase
    .from("pedidos")
    .update(dadosAtualizados)
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

  // serve tanto pedido de varejo quanto encomenda — revalida as duas telas
  revalidatePath("/pedidos");
  revalidatePath("/encomendas");
}

export async function excluirPedido(id: string) {
  const supabase = await createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("tipo_venda, encomenda_acertos(id)")
    .eq("id", id)
    .single().throwOnError();
  if (temAcertoRegistrado(pedido.encomenda_acertos)) throw new Error("Desfaça o acerto da encomenda antes de excluir o pedido.");
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(pedido?.tipo_venda === "encomenda" ? "/encomendas" : "/pedidos");
  revalidatePath("/");
}
