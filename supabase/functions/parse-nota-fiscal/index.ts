// Edge Function: parse-nota-fiscal
//
// Recebe { notaId } de uma nota_fiscal já criada (com foto_url apontando pra
// um objeto no bucket privado "notas-fiscais"), lê a imagem, manda pra API da
// Anthropic extrair os itens (texto, quantidade, valor), tenta casar cada
// item com um insumo já conhecido via insumo_apelidos, e grava tudo em
// nota_itens com validado = false.
//
// NADA aqui atualiza estoque ou custo médio — isso só acontece quando o
// humano confirma cada item na tela de validação (ver src/lib/actions/notas.ts).
// Parsing de nota é sugestão, nunca verdade.
//
// Deploy: supabase functions deploy parse-nota-fiscal
// Secrets necessários (supabase secrets set):
//   ANTHROPIC_API_KEY
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados automaticamente.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NOTAS_BUCKET = "notas-fiscais";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ItemExtraido = {
  texto_original: string;
  quantidade: number;
  valor: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada nos secrets da função.");
    }

    const { notaId } = await req.json();
    if (!notaId) throw new Error("notaId é obrigatório.");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: nota, error: notaError } = await supabase
      .from("notas_fiscais")
      .select("id, foto_url, status")
      .eq("id", notaId)
      .single();

    if (notaError || !nota) throw new Error("Nota fiscal não encontrada.");
    if (!nota.foto_url) throw new Error("Nota sem foto para processar.");

    // foto_url guarda o caminho dentro do bucket (não uma URL pública, o bucket é privado)
    const { data: arquivo, error: downloadError } = await supabase.storage
      .from(NOTAS_BUCKET)
      .download(nota.foto_url);

    if (downloadError || !arquivo) {
      throw new Error(`Falha ao baixar a foto da nota: ${downloadError?.message}`);
    }

    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const base64 = encodeBase64(bytes);
    const mediaType = arquivo.type || "image/jpeg";

    const itens = await extrairItensComIA(base64, mediaType);

    // tenta casar cada item com um insumo já conhecido (de-para aprendido)
    const { data: apelidos } = await supabase
      .from("insumo_apelidos")
      .select("insumo_id, texto_nota");

    const itensParaInserir = itens.map((item) => {
      const apelido = apelidos?.find(
        (a) => a.texto_nota.trim().toLowerCase() === item.texto_original.trim().toLowerCase()
      );
      return {
        nota_id: notaId,
        texto_original: item.texto_original,
        quantidade: item.quantidade,
        valor: item.valor,
        insumo_id: apelido?.insumo_id ?? null,
        validado: false,
      };
    });

    if (itensParaInserir.length > 0) {
      const { error: insertError } = await supabase
        .from("nota_itens")
        .insert(itensParaInserir);
      if (insertError) throw insertError;
    }

    // o valor total da nota é sempre a soma dos itens lidos — nunca digitado
    // pelo usuário, pra não divergir do que a IA (e depois o humano) confirmar.
    const valorTotal = itensParaInserir.reduce((soma, i) => soma + i.valor, 0);

    await supabase
      .from("notas_fiscais")
      .update({ status: "aguardando_validacao", valor_total: valorTotal })
      .eq("id", notaId);

    return new Response(
      JSON.stringify({ ok: true, itensEncontrados: itensParaInserir.length }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

async function extrairItensComIA(
  base64Image: string,
  mediaType: string
): Promise<ItemExtraido[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: [
                "Essa imagem é uma nota fiscal ou cupom de compra de insumos de confeitaria.",
                "Extraia CADA item de compra listado, com:",
                "- texto_original: o texto do item exatamente como está impresso (nome do produto, sem preço)",
                "- quantidade: número (se vier em unidades como '2 UN' ou '1,5 KG', extraia só o número)",
                "- valor: valor total pago naquele item, em reais, como número (não string)",
                "",
                "Responda SOMENTE com um JSON array, sem markdown, sem explicação. Exemplo:",
                '[{"texto_original":"FARINHA TRIGO TIPO1 1KG","quantidade":2,"valor":9.98}]',
                "",
                "Se não conseguir ler algum campo com confiança, faça sua melhor estimativa — um humano vai validar cada item depois.",
              ].join("\n"),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const texto = await response.text();
    throw new Error(`Anthropic API falhou (${response.status}): ${texto}`);
  }

  const data = await response.json();
  const textoResposta: string = data.content?.[0]?.text ?? "[]";
  const jsonLimpo = textoResposta
    .trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    const itens = JSON.parse(jsonLimpo);
    if (!Array.isArray(itens)) return [];
    return itens
      .filter((i) => i && typeof i.texto_original === "string")
      .map((i) => ({
        texto_original: String(i.texto_original).trim(),
        quantidade: Number(i.quantidade) || 0,
        valor: Number(i.valor) || 0,
      }));
  } catch {
    console.error("Falha ao parsear JSON da IA:", jsonLimpo);
    return [];
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
