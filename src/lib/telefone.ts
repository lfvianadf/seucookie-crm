/**
 * Máscara e normalização de telefone.
 *
 * O telefone é a chave que reencontra o cliente, então o que vai pro banco
 * precisa ser sempre o mesmo formato — senão "(84) 99999-8888" e
 * "84999998888" viram dois clientes diferentes e o cartão fidelidade se
 * divide em dois.
 *
 * Na tela: formatado, fácil de conferir. No banco: só dígitos.
 */

/** Formata enquanto digita: (84) 99999-8888 ou (84) 9999-8888. */
export function formatarTelefone(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;

  // celular tem 9 dígitos depois do DDD; fixo tem 8
  const corte = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
}

/** Só dígitos — é assim que o telefone é gravado e comparado. */
export function normalizarTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

/**
 * Aceita 10 (fixo) ou 11 dígitos (celular), ambos com DDD.
 * Vazio não é inválido: quem valida obrigatoriedade é o formulário.
 */
export function telefoneValido(valor: string) {
  const d = normalizarTelefone(valor);
  return d.length === 0 || d.length === 10 || d.length === 11;
}
