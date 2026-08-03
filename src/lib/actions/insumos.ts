"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UnidadeBase } from "@/lib/types/database";

export async function criarInsumo(formData: FormData) {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const unidade_base = String(formData.get("unidade_base") ?? "") as UnidadeBase;
  const estoque_atual = Number(formData.get("estoque_atual") ?? 0);
  const custo_medio_por_unidade = Number(
    formData.get("custo_medio_por_unidade") ?? 0
  );
  const preco_atual = Number(formData.get("preco_atual") ?? 0);

  if (!nome || !unidade_base) return;

  await supabase.from("insumos").insert({
    nome,
    unidade_base,
    estoque_atual: Number.isNaN(estoque_atual) ? 0 : estoque_atual,
    custo_medio_por_unidade: Number.isNaN(custo_medio_por_unidade)
      ? 0
      : custo_medio_por_unidade,
    preco_atual: Number.isNaN(preco_atual) ? 0 : preco_atual,
  });

  revalidatePath("/insumos");
}

export async function atualizarInsumo(id: string, formData: FormData) {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const unidade_base = String(formData.get("unidade_base") ?? "") as UnidadeBase;
  const estoque_atual = Number(formData.get("estoque_atual") ?? 0);
  const custo_medio_por_unidade = Number(
    formData.get("custo_medio_por_unidade") ?? 0
  );
  const preco_atual = Number(formData.get("preco_atual") ?? 0);

  if (!nome || !unidade_base) return;

  await supabase
    .from("insumos")
    .update({
      nome,
      unidade_base,
      estoque_atual: Number.isNaN(estoque_atual) ? 0 : estoque_atual,
      custo_medio_por_unidade: Number.isNaN(custo_medio_por_unidade)
        ? 0
        : custo_medio_por_unidade,
      preco_atual: Number.isNaN(preco_atual) ? 0 : preco_atual,
    })
    .eq("id", id);

  revalidatePath("/insumos");
}

/**
 * Registra uma compra direto no insumo, sem passar pela tela de nota fiscal.
 * É o caminho rápido pra quando você comprou no mercado e quer só lançar.
 *
 * `quantidade` vem na unidade em que se compra (kg/L/un) e `valorPago` é o
 * total da compra. O custo médio é ponderado pelo estoque que já existia —
 * sobrescrever faria o custo oscilar errado a cada compra (seção 3 do doc).
 */
export async function registrarEntradaInsumo(params: {
  insumoId: string;
  quantidade: number;
  valorPago: number;
}) {
  const { insumoId, quantidade, valorPago } = params;

  if (!quantidade || quantidade <= 0) {
    throw new Error("Quantidade precisa ser maior que zero.");
  }
  if (valorPago < 0) {
    throw new Error("Valor pago não pode ser negativo.");
  }

  const supabase = await createClient();
  const { data: insumo, error: buscaError } = await supabase
    .from("insumos")
    .select("unidade_base, estoque_atual, custo_medio_por_unidade")
    .eq("id", insumoId)
    .single();

  if (buscaError) throw buscaError;

  // estoque é guardado em g/ml/un; a compra é informada em kg/L/un
  const fator = insumo.unidade_base === "un" ? 1 : 1000;
  const estoqueAnteriorGrande = Number(insumo.estoque_atual) / fator;
  const custoAnterior = Number(insumo.custo_medio_por_unidade);

  const valorEstoqueAnterior = estoqueAnteriorGrande * custoAnterior;
  const quantidadeTotal = estoqueAnteriorGrande + quantidade;
  const custoMedio =
    quantidadeTotal > 0
      ? (valorEstoqueAnterior + valorPago) / quantidadeTotal
      : valorPago / quantidade;

  const { error } = await supabase
    .from("insumos")
    .update({
      estoque_atual: Number(insumo.estoque_atual) + quantidade * fator,
      custo_medio_por_unidade: custoMedio,
      preco_atual: valorPago / quantidade,
    })
    .eq("id", insumoId);

  if (error) throw error;

  revalidatePath("/insumos");
  revalidatePath(`/insumos/${insumoId}`);
  revalidatePath("/insumos/receitas");
}

export async function excluirInsumo(id: string) {
  const supabase = await createClient();
  await supabase.from("insumos").delete().eq("id", id);
  revalidatePath("/insumos");
}
