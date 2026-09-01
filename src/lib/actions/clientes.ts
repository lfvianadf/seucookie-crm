"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizarTelefone } from "@/lib/telefone";

export async function encontrarOuCriarCliente(
  nome: string,
  telefone: string,
  endereco?: string | null
) {
  const supabase = await createClient();

  // sempre só dígitos: é o que está gravado, e comparar com máscara faria
  // o cliente existente não ser encontrado e virar cadastro duplicado
  const digitos = normalizarTelefone(telefone);

  const { data: existente } = await supabase
    .from("clientes")
    .select("*")
    .eq("telefone", digitos)
    .maybeSingle();

  if (existente) return existente;

  const { data: novo, error } = await supabase
    .from("clientes")
    .insert({ nome, telefone: digitos, endereco: endereco || null })
    .select()
    .single();

  if (error) throw error;
  return novo;
}

export async function buscarClientePorTelefone(telefone: string) {
  const digitos = normalizarTelefone(telefone);
  if (!digitos) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("*")
    .eq("telefone", digitos)
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
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  const endereco = String(formData.get("endereco") ?? "").trim() || null;

  if (!nome || !telefone) return;

  await encontrarOuCriarCliente(nome, telefone, endereco);
  revalidatePath("/clientes");
}

export async function atualizarCliente(id: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  const endereco = String(formData.get("endereco") ?? "").trim() || null;

  if (!nome || !telefone) {
    throw new Error("Nome e telefone são obrigatórios.");
  }

  const supabase = await createClient();

  // o telefone identifica o cliente, então trocá-lo pra um já existente
  // fundiria dois cadastros sem querer — barra antes de gravar
  const { data: conflito } = await supabase
    .from("clientes")
    .select("id, nome")
    .eq("telefone", telefone)
    .neq("id", id)
    .maybeSingle();

  if (conflito) {
    throw new Error(`Esse telefone já é de ${conflito.nome}.`);
  }

  const { error } = await supabase
    .from("clientes")
    .update({ nome, telefone, endereco })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/clientes");
  revalidatePath("/fidelidade");
}

export async function buscarPedidosDoCliente(clienteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos")
    .select(
      "id, status, valor_total, data_pedido, pedido_itens(quantidade, produtos(nome))"
    )
    .eq("cliente_id", clienteId)
    .order("data_pedido", { ascending: false });

  return data ?? [];
}

export async function excluirCliente(id: string) {
  const supabase = await createClient();

  // pedido guarda cliente_id: apagar o cliente deixaria o histórico órfão
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);

  if (count && count > 0) {
    throw new Error(
      `Esse cliente tem ${count} pedido${count > 1 ? "s" : ""} no histórico e não pode ser excluído.`
    );
  }

  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/clientes");
}
