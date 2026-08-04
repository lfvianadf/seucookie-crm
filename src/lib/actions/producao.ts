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

  // a mensagem do banco diz qual insumo faltou e quanto — vale muito mais
  // que um "não foi possível registrar" genérico na tela
  if (error) throw new Error(error.message);

  revalidarInsumos();
}

export async function atualizarProducao(params: {
  producaoId: string;
  receitaId: string;
  produtoId: string;
  quantidade: number;
  data?: string;
}) {
  const { producaoId, receitaId, produtoId, quantidade, data } = params;

  if (!receitaId || !produtoId || !quantidade || quantidade <= 0) {
    throw new Error("Receita, produto e quantidade são obrigatórios.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_producao", {
    p_producao_id: producaoId,
    p_receita_id: receitaId,
    p_produto_id: produtoId,
    p_quantidade: quantidade,
    p_data: data ?? null,
  });

  if (error) throw new Error(error.message);

  revalidarInsumos();
}

export async function excluirProducao(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("estornar_producao", {
    p_producao_id: id,
  });

  if (error) throw error;

  revalidarInsumos();
}

// produção mexe em insumo, produto e no cálculo das receitas — as três
// telas precisam ser invalidadas junto.
function revalidarInsumos() {
  revalidatePath("/insumos/producao");
  revalidatePath("/insumos");
  revalidatePath("/insumos/receitas");
  revalidatePath("/produtos");
}
