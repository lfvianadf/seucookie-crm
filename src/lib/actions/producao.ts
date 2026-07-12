"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registrarProducao(params: {
  receitaId: string;
  produtoId: string;
  quantidade: number;
  data?: string;
}) {
  const { receitaId, produtoId, quantidade, data } = params;

  if (!receitaId || !produtoId || !quantidade || quantidade <= 0) {
    throw new Error("Receita, produto e quantidade são obrigatórios.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_producao", {
    p_receita_id: receitaId,
    p_produto_id: produtoId,
    p_quantidade: quantidade,
    p_data: data,
  });

  if (error) throw error;

  revalidatePath("/insumos/producao");
  revalidatePath("/insumos");
  revalidatePath("/insumos/receitas");
}
