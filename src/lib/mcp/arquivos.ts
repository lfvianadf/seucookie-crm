export const MAX_ARQUIVO_BYTES = 2_000_000;
export const MAX_MCP_BODY_BYTES = 3_000_000;

export function arquivoParaFile(arquivo: { nome: string; tipo: string; base64: string }) {
  const bytes = Buffer.from(arquivo.base64, "base64");
  if (!bytes.length || bytes.length > MAX_ARQUIVO_BYTES || bytes.toString("base64") !== arquivo.base64) {
    throw new Error("Arquivo inválido. Envie base64 puro de uma imagem de até 2 MB.");
  }
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const gif = ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6));
  const tipos: Record<string, [boolean, string]> = {
    "image/png": [png, "png"], "image/jpeg": [jpeg, "jpg"],
    "image/webp": [webp, "webp"], "image/gif": [gif, "gif"],
  };
  const formato = tipos[arquivo.tipo];
  if (!formato?.[0]) throw new Error("O conteúdo do arquivo não corresponde ao tipo de imagem informado.");
  const nome = arquivo.nome.replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N}_-]/gu, "_") || "imagem";
  return new File([new Uint8Array(bytes)], `${nome}.${formato[1]}`, { type: arquivo.tipo });
}
