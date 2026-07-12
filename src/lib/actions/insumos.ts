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

export async function excluirInsumo(id: string) {
  const supabase = await createClient();
  await supabase.from("insumos").delete().eq("id", id);
  revalidatePath("/insumos");
}
