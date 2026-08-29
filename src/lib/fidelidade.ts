/** Cookies necessários para ganhar uma cortesia. */
export const META_FIDELIDADE = 10;

export type Fidelidade = {
  /** cookies comprados menos os já resgatados */
  saldo: number;
  /** carimbos preenchidos no cartão atual (0 a 9) */
  carimbos: number;
  /** cortesias completas ainda não entregues */
  cortesias: number;
  /** quantos faltam pro próximo cartão fechar */
  faltam: number;
};

/**
 * Traduz o saldo de cookies em cartão.
 *
 * Um cliente com 25 cookies tem 2 cortesias a receber e 5 carimbos no cartão
 * seguinte. Separar os dois importa porque a cortesia é entregue à mão: sem
 * isso, quem comprou 25 de uma vez perderia uma das duas.
 */
export function calcularFidelidade(saldo: number): Fidelidade {
  const seguro = Math.max(0, saldo);
  const cortesias = Math.floor(seguro / META_FIDELIDADE);
  const carimbos = seguro % META_FIDELIDADE;
  return {
    saldo: seguro,
    cortesias,
    carimbos,
    faltam: cortesias > 0 && carimbos === 0 ? 0 : META_FIDELIDADE - carimbos,
  };
}

/** Mensagem pronta pro WhatsApp, revisada por você antes de enviar. */
export function mensagemFidelidade(nome: string, f: Fidelidade) {
  const primeiroNome = nome.trim().split(/\s+/)[0];

  if (f.cortesias > 0) {
    return f.cortesias === 1
      ? `Oi, ${primeiroNome}! Seu cartão fidelidade fechou — você tem 1 cookie de cortesia pra resgatar no próximo pedido. 🍪`
      : `Oi, ${primeiroNome}! Você já tem ${f.cortesias} cookies de cortesia pra resgatar. 🍪`;
  }

  if (f.faltam === 1) {
    return `Oi, ${primeiroNome}! Falta só 1 cookie pro seu cartão fidelidade fechar e você ganhar 1 de cortesia. 🍪`;
  }

  return `Oi, ${primeiroNome}! Você já tem ${f.carimbos} de ${META_FIDELIDADE} cookies no cartão fidelidade. Faltam ${f.faltam} pra ganhar 1 de cortesia. 🍪`;
}

/** wa.me exige só dígitos, com DDI. Assume Brasil quando não vier. */
export function linkWhatsApp(telefone: string, mensagem: string) {
  const digitos = telefone.replace(/\D/g, "");
  const comDdi = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`;
}
