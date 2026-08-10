"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularCustoReceita } from "@/lib/receita-custo";

/**
 * Registra cookies que se perderam (queimaram, caíram, passaram do ponto).
 *
 * O prejuízo lançado é o custo de PRODUÇÃO, não o preço de venda: o dinheiro
 * que já saiu em insumo é o que de fato se perdeu. Usar o preço de venda
 * inventaria um lucro que nunca existiu.
 *
 * O custo é congelado aqui, como preco_unitario em pedido_itens — o custo da
 * receita muda quando o insumo muda de preço, e uma perda antiga não pode
 * ser recalculada pelo custo de hoje.
 *
 * Os insumos não são baixados: já saíram dos lotes quando a fornada foi
 * registrada. O trigger no banco cuida de tirar do estoque do produto.
 */
export async function registrarPerda(params: {
  produtoId: string;
  quantidade: number;
  motivo?: string;
  data?: string;
}) {
  const { produtoId, quantidade, motivo, data } = params;

  if (!produtoId) throw new Error("Selecione o produto perdido.");
  if (!quantidade || quantidade <= 0) {
    throw new Error("Quantidade precisa ser maior que zero.");
  }

  const supabase = await createClient();

  const { data: produto, error: produtoError } = await supabase
    .from("produtos")
    .select("receita_id")
    .eq("id", produtoId)
    .single();

  if (produtoError) throw new Error(produtoError.message);

  let custoUnitario = 0;
  if (produto.receita_id) {
    const [{ data: receita }, { data: receitaInsumos }, { data: insumos }] =
      await Promise.all([
        supabase
          .from("receitas")
          .select("id, rendimento_cookies")
          .eq("id", produto.receita_id)
          .single(),
        supabase.from("receita_insumos").select("*"),
        supabase.from("insumos").select("*"),
      ]);

    if (receita) {
      custoUnitario = calcularCustoReceita(
        receita,
        receitaInsumos ?? [],
        insumos ?? []
      ).custoPorCookie;
    }
  }

  const { error } = await supabase.from("perdas").insert({
    produto_id: produtoId,
    quantidade,
    custo_unitario: custoUnitario,
    motivo: motivo?.trim() || null,
    data: data ?? new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  revalidarPerdas();
}

export async function excluirPerda(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("perdas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidarPerdas();
}

// perda mexe no estoque do produto e no lucro do mês
function revalidarPerdas() {
  revalidatePath("/perdas");
  revalidatePath("/financeiro");
  revalidatePath("/produtos");
  revalidatePath("/");
}
