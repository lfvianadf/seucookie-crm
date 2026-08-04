"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NOTAS_BUCKET = "notas-fiscais";

export async function criarNotaFiscal(formData: FormData) {
  const supabase = await createClient();

  const foto = formData.get("foto");
  const dataCompra = String(formData.get("data_compra") ?? "");

  if (!(foto instanceof File) || foto.size === 0) {
    throw new Error("Selecione uma foto da nota.");
  }
  if (!dataCompra) {
    throw new Error("Data da compra é obrigatória.");
  }

  const caminho = `${crypto.randomUUID()}-${foto.name}`;
  const { error: uploadError } = await supabase.storage
    .from(NOTAS_BUCKET)
    .upload(caminho, foto, { contentType: foto.type });

  if (uploadError) throw uploadError;

  const { data: nota, error } = await supabase
    .from("notas_fiscais")
    .insert({
      foto_url: caminho,
      data_compra: dataCompra,
      // a IA preenche isso somando os itens depois de ler a foto — ninguém digita.
      valor_total: 0,
      status: "processando",
    })
    .select()
    .single();

  if (error) throw error;

  const { error: fnError } = await supabase.functions.invoke(
    "parse-nota-fiscal",
    { body: { notaId: nota.id } }
  );

  if (fnError) {
    // a função pode falhar (ex: secret não configurada) — a nota fica
    // "processando" e pode ser reprocessada depois; não trava o cadastro.
    console.error("parse-nota-fiscal falhou:", fnError);
  }

  revalidatePath("/insumos/notas");
  redirect(`/insumos/notas/${nota.id}`);
}

export async function reprocessarNota(notaId: string) {
  const supabase = await createClient();
  await supabase.from("notas_fiscais").update({ status: "processando" }).eq("id", notaId);
  await supabase.functions.invoke("parse-nota-fiscal", { body: { notaId } });
  revalidatePath(`/insumos/notas/${notaId}`);
}

// recalcula o total da nota como a soma dos itens que sobraram, e fecha a
// nota como confirmada se não houver mais nenhum pendente.
async function recalcularTotalNota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  notaId: string
) {
  const { data: todosItens } = await supabase
    .from("nota_itens")
    .select("valor, validado")
    .eq("nota_id", notaId);

  const valorTotalNota = (todosItens ?? []).reduce(
    (soma, i) => soma + Number(i.valor),
    0
  );
  const pendentes = (todosItens ?? []).filter((i) => !i.validado);

  await supabase
    .from("notas_fiscais")
    .update({
      valor_total: valorTotalNota,
      ...(todosItens?.length && pendentes.length === 0
        ? { status: "confirmada" as const }
        : {}),
    })
    .eq("id", notaId);
}

export async function excluirItemNota(itemId: string, notaId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("nota_itens").delete().eq("id", itemId);
  if (error) throw error;

  await recalcularTotalNota(supabase, notaId);

  revalidatePath(`/insumos/notas/${notaId}`);
  revalidatePath("/insumos/notas");
}

export async function validarItemNota(params: {
  itemId: string;
  notaId: string;
  insumoId: string;
  quantidade: number;
  valor: number;
  textoOriginal: string;
}) {
  const { itemId, notaId, insumoId, quantidade, valor, textoOriginal } = params;
  const supabase = await createClient();

  const { data: insumo, error: insumoError } = await supabase
    .from("insumos")
    .select("unidade_base")
    .eq("id", insumoId)
    .single();

  if (insumoError || !insumo) throw new Error("Insumo não encontrado.");

  // Nota validada é uma compra como qualquer outra: vira um lote. O estoque
  // e o custo médio do insumo saem dos lotes com saldo, então nada é
  // sobrescrito aqui — a function cuida de reprocessar os dois.
  //
  // `quantidade` do item da nota vem na unidade base (g/ml/un), mas a
  // function espera a unidade de compra (kg/L/un), então converte de volta.
  const fator = insumo.unidade_base === "un" ? 1 : 1000;
  const { error: loteError } = await supabase.rpc("registrar_entrada_insumo", {
    p_insumo_id: insumoId,
    p_quantidade: quantidade / fator,
    p_valor_pago: valor,
    p_data: null,
  });

  if (loteError) throw new Error(loteError.message);

  const { error: updateItemError } = await supabase
    .from("nota_itens")
    .update({ insumo_id: insumoId, quantidade, valor, validado: true })
    .eq("id", itemId);

  if (updateItemError) throw updateItemError;

  // aprende o de-para: da próxima vez que essa nota trouxer esse texto,
  // já reconhece o insumo sozinho.
  await supabase
    .from("insumo_apelidos")
    .upsert(
      { insumo_id: insumoId, texto_nota: textoOriginal },
      { onConflict: "texto_nota" }
    );

  // o total da nota é sempre a soma dos itens — nunca digitado, pra não
  // divergir do que foi realmente lido/corrigido.
  await recalcularTotalNota(supabase, notaId);

  revalidatePath(`/insumos/notas/${notaId}`);
  revalidatePath("/insumos");
}

export async function criarInsumoRapido(nome: string, unidadeBase: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insumos")
    .insert({
      nome,
      unidade_base: unidadeBase as "g" | "ml" | "un",
      estoque_atual: 0,
      custo_medio_por_unidade: 0,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/insumos");
  return data;
}
