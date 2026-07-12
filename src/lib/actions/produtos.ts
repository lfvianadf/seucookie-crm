"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const FOTOS_BUCKET = "seucookie";

async function uploadFoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  foto: FormDataEntryValue | null
): Promise<string | null> {
  if (!(foto instanceof File) || foto.size === 0) return null;

  const extensao = foto.name.split(".").pop() ?? "jpg";
  const caminho = `produtos/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage
    .from(FOTOS_BUCKET)
    .upload(caminho, foto, { contentType: foto.type, upsert: false });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(caminho);

  return publicUrl;
}

export async function criarProduto(formData: FormData) {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const preco = Number(formData.get("preco"));
  const capitulo = String(formData.get("capitulo") ?? "").trim() || null;
  const numeroReceitaRaw = String(formData.get("numero_receita") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const disponivel = formData.get("disponivel") === "on";
  const receitaId = String(formData.get("receita_id") ?? "").trim() || null;

  if (!nome || Number.isNaN(preco)) return;

  const foto_url = await uploadFoto(supabase, formData.get("foto"));

  await supabase.from("produtos").insert({
    nome,
    preco,
    capitulo,
    descricao,
    disponivel,
    foto_url,
    receita_id: receitaId,
    numero_receita: numeroReceitaRaw ? Number(numeroReceitaRaw) : null,
  });

  revalidatePath("/produtos");
}

export async function atualizarProduto(id: string, formData: FormData) {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const preco = Number(formData.get("preco"));
  const capitulo = String(formData.get("capitulo") ?? "").trim() || null;
  const numeroReceitaRaw = String(formData.get("numero_receita") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const disponivel = formData.get("disponivel") === "on";
  const receitaId = String(formData.get("receita_id") ?? "").trim() || null;

  if (!nome || Number.isNaN(preco)) return;

  const foto_url = await uploadFoto(supabase, formData.get("foto"));

  await supabase
    .from("produtos")
    .update({
      nome,
      preco,
      capitulo,
      descricao,
      disponivel,
      receita_id: receitaId,
      numero_receita: numeroReceitaRaw ? Number(numeroReceitaRaw) : null,
      ...(foto_url ? { foto_url } : {}),
    })
    .eq("id", id);

  revalidatePath("/produtos");
}

export async function alternarDisponibilidade(id: string, disponivel: boolean) {
  const supabase = await createClient();
  await supabase.from("produtos").update({ disponivel }).eq("id", id);
  revalidatePath("/produtos");
}

export async function excluirProduto(id: string) {
  const supabase = await createClient();
  await supabase.from("produtos").delete().eq("id", id);
  revalidatePath("/produtos");
}
