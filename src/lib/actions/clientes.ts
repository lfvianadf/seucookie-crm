"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function encontrarOuCriarCliente(
  nome: string,
  telefone: string,
  endereco?: string | null
) {
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("clientes")
    .select("*")
    .eq("telefone", telefone)
    .maybeSingle();

  if (existente) return existente;

  const { data: novo, error } = await supabase
    .from("clientes")
    .insert({ nome, telefone, endereco: endereco || null })
    .select()
    .single();

  if (error) throw error;
  return novo;
}

export async function buscarClientePorTelefone(telefone: string) {
  if (!telefone) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("*")
    .eq("telefone", telefone)
    .maybeSingle();

  return data;
}

export async function buscarClientesPorNome(nome: string) {
  const termo = nome.trim();
  if (termo.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, nome, telefone, endereco")
    .ilike("nome", `%${termo}%`)
    .order("nome")
    .limit(6);

  return data ?? [];
}

export async function criarCliente(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim() || null;

  if (!nome || !telefone) return;

  await encontrarOuCriarCliente(nome, telefone, endereco);
  revalidatePath("/clientes");
}
