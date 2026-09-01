"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarPerda } from "@/lib/actions/perdas";
import type { EncomendaDestinoSobra } from "@/lib/types/database";

export type SobraAcerto = {
  produtoId: string;
  qtdEntregue: number;
  qtdSobra: number;
  destino: EncomendaDestinoSobra;
  precoUnitario: number;
};

/**
 * Fecha o acerto de uma encomenda consignada: você informa quanto sobrou
 * de cada sabor e quanto de fato recebeu.
 *
 * A sobra que sobra volta ao estoque incondicionalmente (via trigger no
 * banco); quando o destino escolhido é 'perda', chamamos registrarPerda
 * logo em seguida — o mesmo trigger de perdas baixa de novo e o prejuízo
 * aparece contabilizado no Financeiro, em vez de silenciosamente reduzir
 * a venda.
 */
export async function registrarAcerto(params: {
  pedidoId: string;
  sobras: SobraAcerto[];
  valorRecebido: number;
  data?: string;
  observacoes?: string;
}) {
  const { pedidoId, sobras, valorRecebido, data, observacoes } = params;

  if (!pedidoId) throw new Error("Pedido não informado.");
  if (sobras.length === 0) {
    throw new Error("Informe ao menos um item entregue.");
  }
  if (Number.isNaN(valorRecebido) || valorRecebido < 0) {
    throw new Error("Valor recebido inválido.");
  }
  for (const s of sobras) {
    if (s.qtdSobra > s.qtdEntregue) {
      throw new Error(
        "A sobra não pode ser maior do que o que foi entregue."
      );
    }
  }

  const supabase = await createClient();

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("tipo_venda")
    .eq("id", pedidoId)
    .single();

  if (pedidoError) throw new Error(pedidoError.message);
  if (pedido.tipo_venda !== "encomenda") {
    throw new Error("Só encomendas passam por acerto.");
  }

  const { data: acerto, error: acertoError } = await supabase
    .from("encomenda_acertos")
    .insert({
      pedido_id: pedidoId,
      valor_recebido: valorRecebido,
      data: data ?? new Date().toISOString(),
      observacoes: observacoes?.trim() || null,
    })
    .select("id")
    .single();

  if (acertoError) throw new Error(acertoError.message);

  for (const sobra of sobras) {
    // O item de acerto vai PRIMEIRO, a perda depois — nessa ordem, e não
    // ao contrário.
    //
    // ajustar_estoque_produto() usa greatest(estoque + delta, 0): se
    // registrarPerda baixasse o estoque antes de a sobra ter sido devolvida,
    // e o produto já estivesse zerado (como todo produto de encomenda
    // nasce), o piso em zero absorveria a baixa e a devolução seguinte do
    // item de acerto deixaria um saldo fantasma positivo em vez de voltar a
    // zero. Inserindo o item primeiro, a sobra entra no estoque e só depois
    // a perda tira exatamente o que entrou — sem cruzar o piso de zero.
    const { data: item, error: itemError } = await supabase
      .from("encomenda_acerto_itens")
      .insert({
        acerto_id: acerto.id,
        produto_id: sobra.produtoId,
        qtd_entregue: sobra.qtdEntregue,
        qtd_sobra: sobra.qtdSobra,
        destino_sobra: sobra.destino,
        preco_unitario: sobra.precoUnitario,
        perda_id: null,
      })
      .select("id")
      .single();

    if (itemError) throw new Error(itemError.message);

    if (sobra.destino === "perda" && sobra.qtdSobra > 0) {
      const perda = await registrarPerda({
        produtoId: sobra.produtoId,
        quantidade: sobra.qtdSobra,
        motivo: "Sobra de encomenda não revendida",
        data: data ?? new Date().toISOString(),
      });

      const { error: vinculoError } = await supabase
        .from("encomenda_acerto_itens")
        .update({ perda_id: perda?.id ?? null })
        .eq("id", item.id);

      if (vinculoError) throw new Error(vinculoError.message);
    }
  }

  revalidarEncomendas();
}

/**
 * Desfaz um acerto: as perdas vinculadas são excluídas primeiro, depois o
 * acerto (cascade apaga os itens).
 *
 * A ordem é a mesma cautela do registrarAcerto, espelhada: excluir o acerto
 * primeiro tiraria a sobra do estoque via trigger (qtd_sobra negativo) e,
 * se o produto estivesse em zero, o piso em zero de ajustar_estoque_produto
 * absorveria essa baixa; a devolução da perda em seguida somaria por cima
 * de um chão que não desceu de verdade, deixando saldo fantasma. Excluindo
 * a perda primeiro, a devolução dela é o que acontece antes do chão, e o
 * acerto subtrai depois sem cruzar zero.
 */
export async function excluirAcerto(acertoId: string) {
  const supabase = await createClient();

  const { data: itens } = await supabase
    .from("encomenda_acerto_itens")
    .select("perda_id")
    .eq("acerto_id", acertoId);

  const perdaIds = (itens ?? [])
    .map((i) => i.perda_id)
    .filter((id): id is string => !!id);

  if (perdaIds.length > 0) {
    const { error: perdaError } = await supabase
      .from("perdas")
      .delete()
      .in("id", perdaIds);
    if (perdaError) throw new Error(perdaError.message);
  }

  const { error } = await supabase
    .from("encomenda_acertos")
    .delete()
    .eq("id", acertoId);

  if (error) throw new Error(error.message);

  revalidarEncomendas();
}

// acerto mexe no estoque do produto, no lucro do mês e na pendência
// "a receber" do dashboard
function revalidarEncomendas() {
  revalidatePath("/encomendas");
  revalidatePath("/financeiro");
  revalidatePath("/produtos");
  revalidatePath("/");
  revalidatePath("/clientes");
}
