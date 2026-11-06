"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoProduto, ProdutoCanal } from "@/lib/types/database";

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

// box não tem estoque próprio — o "cardápio" de cookies que cabem nela é
// tudo que ela precisa guardar. cookie não deveria ter linhas aqui; limpa
// pra evitar lixo se o produto foi trocado de box pra cookie. No fim,
// recalcula disponivel = soma do estoque dos cookies selecionados > 0 — o
// checkbox "Disponível" vem desabilitado pra box no formulário, então o
// valor que chegaria pelo form seria sempre falso; isso aqui é que manda.
async function validarCookiesBox(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData) {
  if (formData.get("tipo_produto") !== "box") return;
  const ids = formData.getAll("box_cookies").map(String).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error("O cardápio da box contém cookies repetidos.");
  if (!ids.length) return;
  const { data } = await supabase.from("produtos").select("id, tipo_produto").in("id", ids).throwOnError();
  if (data.length !== ids.length || data.some((p) => p.tipo_produto !== "cookie")) {
    throw new Error("O cardápio da box deve conter somente cookies cadastrados.");
  }
}

async function sincronizarBoxItens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string,
  tipoProduto: TipoProduto,
  canal: ProdutoCanal,
  formData: FormData
) {
  await supabase.from("produto_box_itens").delete().eq("box_id", produtoId).throwOnError();

  if (tipoProduto !== "box") return;

  // box de encomenda nunca reabre no site, mesmo com estoque > 0 — mesma
  // regra de disponivelFinal acima, repetida aqui porque este helper roda
  // depois e sobrescreveria disponivel de volta pra true
  if (canal === "encomenda") {
    await supabase.from("produtos").update({ disponivel: false }).eq("id", produtoId).throwOnError();
  }

  const cookieIds = formData.getAll("box_cookies").map(String).filter(Boolean);
  if (cookieIds.length === 0) {
    await supabase.from("produtos").update({ disponivel: false }).eq("id", produtoId).throwOnError();
    return;
  }

  await supabase.from("produto_box_itens").insert(
    cookieIds.map((cookieId) => ({ box_id: produtoId, cookie_id: cookieId }))
  ).throwOnError();

  if (canal === "encomenda") return;

  const { data: cookies } = await supabase
    .from("produtos")
    .select("qtd_estoque")
    .in("id", cookieIds).throwOnError();

  const somaEstoque = (cookies ?? []).reduce((s, c) => s + c.qtd_estoque, 0);

  await supabase
    .from("produtos")
    .update({ disponivel: somaEstoque > 0 })
    .eq("id", produtoId).throwOnError();
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
  const qtdEstoqueRaw = String(formData.get("qtd_estoque") ?? "").trim();
  const qtdEstoque = qtdEstoqueRaw ? Number(qtdEstoqueRaw) : 0;
  // cada campo só vale pro seu tipo: box guarda quantos cookies cabem,
  // cookie guarda quanto soma ao entrar numa box.
  const qtdCookiesBoxRaw = String(formData.get("qtd_cookies_box") ?? "").trim();
  const qtdCookiesBox = qtdCookiesBoxRaw ? Number(qtdCookiesBoxRaw) : null;
  const acrescimoBox = Number(formData.get("acrescimo_box") ?? 0);

  const tipoProduto = (String(formData.get("tipo_produto") ?? "cookie") ||
    "cookie") as TipoProduto;
  const canal = (String(formData.get("canal") ?? "varejo") ||
    "varejo") as ProdutoCanal;
  // nunca confiar no checkbox pra esconder preço de atacado: produto de
  // encomenda é sempre indisponível no site, mesmo que o form mande outra
  // coisa — a policy de RLS já reforça isso, aqui é defesa em profundidade
  const disponivelFinal = canal === "encomenda" ? false : disponivel;

  if (!nome || Number.isNaN(preco)) return;

  await validarCookiesBox(supabase, formData);
  const foto_url = await uploadFoto(supabase, formData.get("foto"));

  const { data: produto, error } = await supabase
    .from("produtos")
    .insert({
      nome,
      preco,
      capitulo,
      descricao,
      disponivel: disponivelFinal,
      qtd_estoque: Number.isNaN(qtdEstoque) ? 0 : qtdEstoque,
      tipo_produto: tipoProduto,
      canal,
      qtd_cookies_box:
        tipoProduto === "box" && qtdCookiesBox && qtdCookiesBox > 0
          ? qtdCookiesBox
          : null,
      acrescimo_box:
        tipoProduto === "cookie" && !Number.isNaN(acrescimoBox)
          ? acrescimoBox
          : 0,
      foto_url,
      receita_id: receitaId,
      numero_receita: numeroReceitaRaw ? Number(numeroReceitaRaw) : null,
    })
    .select("id")
    .single();

  if (error) throw error;

  await sincronizarBoxItens(supabase, produto.id, tipoProduto, canal, formData);

  revalidatePath("/produtos");
  return produto;
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
  const qtdEstoqueRaw = String(formData.get("qtd_estoque") ?? "").trim();
  const qtdEstoque = qtdEstoqueRaw ? Number(qtdEstoqueRaw) : 0;
  // cada campo só vale pro seu tipo: box guarda quantos cookies cabem,
  // cookie guarda quanto soma ao entrar numa box.
  const qtdCookiesBoxRaw = String(formData.get("qtd_cookies_box") ?? "").trim();
  const qtdCookiesBox = qtdCookiesBoxRaw ? Number(qtdCookiesBoxRaw) : null;
  const acrescimoBox = Number(formData.get("acrescimo_box") ?? 0);

  const tipoProduto = (String(formData.get("tipo_produto") ?? "cookie") ||
    "cookie") as TipoProduto;
  const canal = (String(formData.get("canal") ?? "varejo") ||
    "varejo") as ProdutoCanal;
  // nunca confiar no checkbox pra esconder preço de atacado: produto de
  // encomenda é sempre indisponível no site, mesmo que o form mande outra
  // coisa — a policy de RLS já reforça isso, aqui é defesa em profundidade
  const disponivelFinal = canal === "encomenda" ? false : disponivel;

  if (!nome || Number.isNaN(preco)) return;

  await validarCookiesBox(supabase, formData);
  const foto_url = await uploadFoto(supabase, formData.get("foto"));

  const { error } = await supabase
    .from("produtos")
    .update({
      nome,
      preco,
      capitulo,
      descricao,
      disponivel: disponivelFinal,
      ...(qtdEstoqueRaw ? { qtd_estoque: Number.isNaN(qtdEstoque) ? 0 : qtdEstoque } : {}),
      tipo_produto: tipoProduto,
      canal,
      qtd_cookies_box:
        tipoProduto === "box" && qtdCookiesBox && qtdCookiesBox > 0
          ? qtdCookiesBox
          : null,
      acrescimo_box:
        tipoProduto === "cookie" && !Number.isNaN(acrescimoBox)
          ? acrescimoBox
          : 0,
      receita_id: receitaId,
      numero_receita: numeroReceitaRaw ? Number(numeroReceitaRaw) : null,
      ...(foto_url ? { foto_url } : {}),
    })
    .eq("id", id);

  if (error) throw error;

  await sincronizarBoxItens(supabase, id, tipoProduto, canal, formData);

  revalidatePath("/produtos");
}

export async function alternarDisponibilidade(id: string, disponivel: boolean) {
  const supabase = await createClient();
  const { data: produto } = await supabase.from("produtos").select("canal").eq("id", id).single().throwOnError();
  await supabase.from("produtos").update({ disponivel: produto.canal === "encomenda" ? false : disponivel }).eq("id", id).throwOnError();
  revalidatePath("/produtos");
}

export async function excluirProduto(id: string) {
  const supabase = await createClient();
  await supabase.from("produtos").delete().eq("id", id).throwOnError();
  revalidatePath("/produtos");
}
