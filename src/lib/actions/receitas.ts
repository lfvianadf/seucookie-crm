"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type IngredienteReceita = { insumo_id: string; quantidade: number };

export async function criarReceita(params: {
  nome: string;
  rendimento_cookies: number;
  itens: IngredienteReceita[];
}) {
  const { nome, rendimento_cookies, itens } = params;
  if (!nome || !rendimento_cookies || itens.length === 0) {
    throw new Error("Nome, rendimento e ao menos um insumo são obrigatórios.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("salvar_receita_crm", {
    p_id: null, p_nome: nome, p_rendimento: rendimento_cookies, p_itens: itens,
  });
  if (error) throw error;
  revalidatePath("/insumos/receitas");
  return { id: data };
}

export async function atualizarReceita(params: {
  id: string;
  nome: string;
  rendimento_cookies: number;
  itens: IngredienteReceita[];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("salvar_receita_crm", {
    p_id: params.id, p_nome: params.nome,
    p_rendimento: params.rendimento_cookies, p_itens: params.itens,
  });
  if (error) throw error;
  revalidatePath("/insumos/receitas");
  return { id: data };
}

/**
 * Copia uma receita com todos os insumos, para servir de ponto de partida
 * de uma variação (mesma massa, troca só o recheio).
 *
 * Lê os itens do banco em vez de recebê-los da tela: assim a cópia sai fiel
 * ao que está salvo, mesmo que a lista exibida esteja desatualizada.
 */
export async function duplicarReceita(id: string) {
  const supabase = await createClient();

  const { data: original, error } = await supabase
    .from("receitas")
    .select("nome, rendimento_cookies")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  const { data: itens, error: itensError } = await supabase
    .from("receita_insumos")
    .select("insumo_id, quantidade")
    .eq("receita_id", id);

  if (itensError) throw new Error(itensError.message);

  const { data: copia, error: copiaError } = await supabase
    .from("receitas")
    .insert({
      nome: `${original.nome} (cópia)`,
      rendimento_cookies: original.rendimento_cookies,
    })
    .select("id")
    .single();

  if (copiaError) throw new Error(copiaError.message);

  if (itens && itens.length > 0) {
    const { error: copiaItensError } = await supabase
      .from("receita_insumos")
      .insert(
        itens.map((item) => ({
          receita_id: copia.id,
          insumo_id: item.insumo_id,
          quantidade: item.quantidade,
        }))
      );

    if (copiaItensError) throw new Error(copiaItensError.message);
  }

  revalidatePath("/insumos/receitas");
}

export async function excluirReceita(id: string) {
  const supabase = await createClient();
  await supabase.from("receitas").delete().eq("id", id).throwOnError();
  revalidatePath("/insumos/receitas");
}
