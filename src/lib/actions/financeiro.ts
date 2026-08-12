"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { competenciaDe } from "@/lib/competencia";
import type { TipoCusto } from "@/lib/types/database";

// o banco exige parcelas em 'parcelado' e null nos outros dois
function lerParcelas(formData: FormData, tipo: TipoCusto) {
  if (tipo !== "parcelado") return null;
  const parcelas = Number(formData.get("parcelas") ?? 0);
  if (!parcelas || parcelas < 2) {
    throw new Error("Informe em quantas parcelas, no mínimo 2.");
  }
  return parcelas;
}

export async function criarCustoMensal(formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const mes = String(formData.get("mes") ?? "");
  const tipo = (String(formData.get("tipo") ?? "unica") || "unica") as TipoCusto;
  const parcelas = lerParcelas(formData, tipo);

  if (!descricao || Number.isNaN(valor) || valor < 0 || !mes) {
    throw new Error("Descrição, valor e mês são obrigatórios.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("custos_mensais").insert({
    descricao,
    valor,
    competencia: competenciaDe(mes),
    tipo,
    parcelas,
    // coluna legada, mantida em sincronia enquanto existir
    recorrente: tipo === "recorrente",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/financeiro");
}

export async function atualizarCustoMensal(id: string, formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const tipo = (String(formData.get("tipo") ?? "unica") || "unica") as TipoCusto;
  const parcelas = lerParcelas(formData, tipo);

  if (!descricao || Number.isNaN(valor) || valor < 0) {
    throw new Error("Descrição e valor são obrigatórios.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("custos_mensais")
    .update({
      descricao,
      valor,
      tipo,
      parcelas,
      recorrente: tipo === "recorrente",
      // voltar a ser recorrente limpa o encerramento, senão o custo
      // continuaria sumindo dos meses seguintes sem explicação na tela
      encerrado_em: tipo === "recorrente" ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/financeiro");
}

/**
 * Para de repetir um custo recorrente a partir do mês informado, sem apagar
 * o histórico — ele continua aparecendo nos meses em que de fato existiu.
 */
export async function encerrarCustoMensal(id: string, mes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custos_mensais")
    .update({ encerrado_em: competenciaDe(mes) })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/financeiro");
}

export async function excluirCustoMensal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custos_mensais").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/financeiro");
}
