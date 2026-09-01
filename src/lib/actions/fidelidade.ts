"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { META_FIDELIDADE } from "@/lib/fidelidade";

/**
 * Marca que a cortesia foi entregue.
 *
 * O resgate é a única coisa guardada do programa: a contagem de carimbos sai
 * dos pedidos, mas "eu já dei o cookie grátis" não dá pra deduzir de lugar
 * nenhum. Registrar isso é o que faz o contador voltar a zero.
 */
export async function registrarResgate(clienteId: string) {
  const supabase = await createClient();

  // relê o saldo aqui em vez de confiar no que a tela mandou: entre carregar
  // a página e clicar, um pedido pode ter sido cancelado
  const { data: fidelidade, error: erroLeitura } = await supabase
    .from("fidelidade_clientes")
    .select("cookies_no_cartao")
    .eq("cliente_id", clienteId)
    .single();

  if (erroLeitura) throw new Error(erroLeitura.message);

  if (Number(fidelidade.cookies_no_cartao) < META_FIDELIDADE) {
    throw new Error("Esse cliente ainda não completou o cartão.");
  }

  const { error } = await supabase.from("fidelidade_resgates").insert({
    cliente_id: clienteId,
    cookies_usados: META_FIDELIDADE,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/fidelidade");
}

export async function desfazerResgate(resgateId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fidelidade_resgates")
    .delete()
    .eq("id", resgateId);

  if (error) throw new Error(error.message);

  revalidatePath("/fidelidade");
}
