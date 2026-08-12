"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UnidadeBase, CategoriaInsumo } from "@/lib/types/database";

export async function criarInsumo(formData: FormData) {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const unidade_base = String(formData.get("unidade_base") ?? "") as UnidadeBase;
  const categoria = String(
    formData.get("categoria") ?? "outros"
  ) as CategoriaInsumo;
  if (!nome || !unidade_base) return;

  // nasce zerado: estoque e custo passam a existir só quando houver uma
  // entrada de compra, que é o que define o preço de cada lote
  await supabase.from("insumos").insert({ nome, unidade_base, categoria });

  revalidatePath("/insumos");
}

export async function atualizarInsumo(id: string, formData: FormData) {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const unidade_base = String(formData.get("unidade_base") ?? "") as UnidadeBase;
  const categoria = String(
    formData.get("categoria") ?? "outros"
  ) as CategoriaInsumo;
  if (!nome || !unidade_base) return;

  // só identidade: estoque e custo são derivados dos lotes e não podem ser
  // sobrescritos aqui, senão uma edição de nome zeraria o custo real
  await supabase
    .from("insumos")
    .update({ nome, unidade_base, categoria })
    .eq("id", id);

  revalidatePath("/insumos");
}

/**
 * Registra uma compra: cria um lote com quantidade e preço próprios.
 *
 * `quantidade` vem na unidade em que se compra (kg/L/un) e `valorPago` é o
 * total da compra. Quem faz a conta é a function no banco, porque criar o
 * lote e reprocessar estoque/custo do insumo precisa ser uma coisa só — e
 * porque o custo médio agora sai dos lotes com saldo, não de um número
 * sobrescrito a cada compra.
 */
export async function registrarEntradaInsumo(params: {
  insumoId: string;
  quantidade: number;
  valorPago: number;
  data?: string;
}) {
  const { insumoId, quantidade, valorPago, data } = params;

  if (!quantidade || quantidade <= 0) {
    throw new Error("Quantidade precisa ser maior que zero.");
  }
  if (valorPago < 0) {
    throw new Error("Valor pago não pode ser negativo.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_entrada_insumo", {
    p_insumo_id: insumoId,
    p_quantidade: quantidade,
    p_valor_pago: valorPago,
    p_data: data ?? null,
  });

  if (error) throw error;

  revalidatePath("/insumos");
  revalidatePath(`/insumos/${insumoId}`);
  revalidatePath("/insumos/receitas");
}

/**
 * Corrige um lote já lançado (digitou R$ 10 e era R$ 100).
 *
 * A validação de quantidade mora no banco: se o lote já foi consumido, não
 * dá pra reduzi-lo abaixo do que virou cookie, e a função devolve o mínimo
 * permitido em vez de inventar de onde tirar a diferença.
 */
export async function editarLoteInsumo(params: {
  loteId: string;
  insumoId: string;
  quantidade: number;
  valorPago: number;
  data?: string;
}) {
  const { loteId, insumoId, quantidade, valorPago, data } = params;

  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_lote_insumo", {
    p_lote_id: loteId,
    p_quantidade: quantidade,
    p_valor_pago: valorPago,
    p_data: data ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/insumos");
  revalidatePath(`/insumos/${insumoId}`);
  revalidatePath("/insumos/receitas");
}

export async function excluirLoteInsumo(loteId: string, insumoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("excluir_lote_insumo", {
    p_lote_id: loteId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/insumos");
  revalidatePath(`/insumos/${insumoId}`);
  revalidatePath("/insumos/receitas");
}

export async function excluirInsumo(id: string) {
  const supabase = await createClient();
  await supabase.from("insumos").delete().eq("id", id);
  revalidatePath("/insumos");
}
