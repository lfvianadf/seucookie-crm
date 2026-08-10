"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { competenciaDe } from "@/lib/competencia";
import type { OkrMetrica } from "@/lib/types/database";

export type ResultadoChave = {
  descricao: string;
  metrica: OkrMetrica;
  alvo: number;
};

export async function criarOkr(params: {
  objetivo: string;
  mes: string;
  resultados: ResultadoChave[];
}) {
  const { objetivo, mes, resultados } = params;

  if (!objetivo.trim()) throw new Error("O objetivo é obrigatório.");
  if (resultados.length === 0) {
    throw new Error("Adicione ao menos um resultado-chave.");
  }

  const supabase = await createClient();
  const { data: okr, error } = await supabase
    .from("okrs")
    .insert({ objetivo: objetivo.trim(), competencia: competenciaDe(mes) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { error: krError } = await supabase.from("okr_resultados").insert(
    resultados.map((r) => ({
      okr_id: okr.id,
      descricao: r.descricao.trim(),
      metrica: r.metrica,
      alvo: r.alvo,
    }))
  );

  if (krError) throw new Error(krError.message);
  revalidatePath("/okrs");
}

export async function atualizarOkr(params: {
  id: string;
  objetivo: string;
  resultados: (ResultadoChave & { id?: string })[];
}) {
  const { id, objetivo, resultados } = params;

  if (!objetivo.trim()) throw new Error("O objetivo é obrigatório.");
  if (resultados.length === 0) {
    throw new Error("Adicione ao menos um resultado-chave.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("okrs")
    .update({ objetivo: objetivo.trim() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { data: atuais } = await supabase
    .from("okr_resultados")
    .select("id")
    .eq("okr_id", id);

  const idsMantidos = new Set(resultados.filter((r) => r.id).map((r) => r.id));
  const remover = (atuais ?? []).filter((a) => !idsMantidos.has(a.id));

  if (remover.length > 0) {
    await supabase
      .from("okr_resultados")
      .delete()
      .in("id", remover.map((r) => r.id));
  }

  for (const resultado of resultados) {
    if (resultado.id) {
      await supabase
        .from("okr_resultados")
        .update({
          descricao: resultado.descricao.trim(),
          metrica: resultado.metrica,
          alvo: resultado.alvo,
        })
        .eq("id", resultado.id);
    } else {
      await supabase.from("okr_resultados").insert({
        okr_id: id,
        descricao: resultado.descricao.trim(),
        metrica: resultado.metrica,
        alvo: resultado.alvo,
      });
    }
  }

  revalidatePath("/okrs");
}

/** Só faz sentido para KR de métrica 'manual'. */
export async function atualizarProgressoManual(id: string, progresso: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("okr_resultados")
    .update({ progresso_manual: Math.max(progresso, 0) })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/okrs");
}

export async function excluirOkr(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("okrs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/okrs");
}
