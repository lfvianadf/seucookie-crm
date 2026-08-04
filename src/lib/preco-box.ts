/**
 * Preço de uma box = preço base + Σ (acréscimo do cookie × quantidade).
 *
 * Ex: box de 4 a R$ 39,90, Pistache +R$ 3,00 e Nutella +R$ 0
 *     → 2 Nutella + 2 Pistache = 39,90 + (2 × 3,00) = R$ 45,90
 *
 * Fica num lugar só porque o montador do pedido, o resumo do carrinho e o
 * total gravado no banco precisam chegar sempre ao mesmo número — se cada
 * um fizesse a própria conta, uma hora o cliente veria um valor e o pedido
 * gravaria outro.
 *
 * Importante: usa `acrescimo_box`, nunca o `preco` do cookie. Aquele é o
 * preço de venda avulso; dentro da box o sabor custa outra coisa (em geral
 * zero, porque já está pago pelo preço base).
 */

type CookieComAcrescimo = { id: string; acrescimo_box: number };

export function calcularPrecoBox(
  precoBase: number,
  composicao: { cookieId: string; quantidade: number }[],
  cookies: CookieComAcrescimo[]
) {
  const acrescimos = composicao.reduce((soma, item) => {
    const cookie = cookies.find((c) => c.id === item.cookieId);
    return soma + (Number(cookie?.acrescimo_box) || 0) * item.quantidade;
  }, 0);

  return {
    precoBase: Number(precoBase) || 0,
    acrescimos,
    total: (Number(precoBase) || 0) + acrescimos,
  };
}

/** Quantos cookies já foram escolhidos numa composição. */
export function totalEscolhido(
  composicao: Record<string, number> | { quantidade: number }[]
) {
  const valores = Array.isArray(composicao)
    ? composicao.map((c) => c.quantidade)
    : Object.values(composicao);
  return valores.reduce((soma, q) => soma + (q || 0), 0);
}
