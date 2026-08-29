import { META_FIDELIDADE, type Fidelidade } from "@/lib/fidelidade";
import { MASCOTE_BASE64 } from "@/lib/assets/mascote-base64";
import { COOKIE_CARIMBO_BASE64 } from "@/lib/assets/cookie-carimbo-base64";

/**
 * Cartão fidelidade como SVG, para o cliente receber no WhatsApp.
 *
 * Diferente do resto do CRM, aqui a marca aparece inteira: isto vai pro
 * cliente, não pra tela de trabalho. Reproduz o cartão de papel — mesmo
 * bege, mesma berinjela, mesmos dez círculos — mas com os carimbos do
 * cliente de verdade, e sem o "prazer, sou o" do original.
 *
 * SVG e não canvas porque o texto fica nítido em qualquer tamanho e o
 * arquivo é gerado no navegador sem dependência nenhuma.
 */

const PAPEL = "#F5F1E8";
const BERINJELA = "#43303B";
const APAGADO = "#B9AEB2";
const SALVIA = "#7D9B76";

export function cartaoFidelidadeSvg(nome: string, f: Fidelidade) {
  const L = 900;
  const A = 580;

  // dois cookies por linha de 5, como no cartão de papel
  const raioSlot = 46;
  const gapX = 122;
  const gapY = 122;
  const x0 = 92;
  const y0 = 300;

  // Cartão recém-fechado tem carimbos = 0 (10 % 10), mas o cliente comprou
  // os dez — mostrar o cartão vazio pareceria que o progresso sumiu. Enquanto
  // a cortesia não é entregue, ele fica cheio.
  const preenchidos =
    f.cortesias > 0 && f.carimbos === 0 ? META_FIDELIDADE : f.carimbos;

  const slots = Array.from({ length: META_FIDELIDADE }, (_, i) => {
    const linha = Math.floor(i / 5);
    const col = i % 5;
    const cx = x0 + col * gapX;
    const cy = y0 + linha * gapY;
    const preenchido = i < preenchidos;

    const numero = preenchido
      ? ""
      : `<text x="${cx}" y="${cy + 7}" font-size="22" font-weight="600" fill="${APAGADO}" text-anchor="middle">${
          i + 1
        }</text>`;

    const contorno = `<circle cx="${cx}" cy="${cy}" r="${raioSlot}" fill="none" stroke="${
      preenchido ? BERINJELA : APAGADO
    }" stroke-width="2.5"/>`;

    // o PNG já vem com o fundo berinjela, então preenche o círculo inteiro;
    // o clipPath evita que os cantos da imagem vazem pra fora do slot
    // cada slot leva seu próprio clipPath com coordenadas absolutas: um
    // clipPath único em objectBoundingBox se resolve contra a caixa do
    // primeiro elemento e some nos demais
    const miolo = preenchido
      ? `<clipPath id="slot${i}"><circle cx="${cx}" cy="${cy}" r="${raioSlot - 1}"/></clipPath>
         <image href="${COOKIE_CARIMBO_BASE64}" x="${cx - raioSlot}" y="${
           cy - raioSlot
         }" width="${raioSlot * 2}" height="${
           raioSlot * 2
         }" clip-path="url(#slot${i})" preserveAspectRatio="xMidYMid slice"/>`
      : "";

    return contorno + miolo + numero;
  }).join("");

  // Badge no lugar do cookie pontilhado: o número grande é a informação que
  // o cliente procura primeiro, e o rótulo abaixo diz o que ele significa.
  const badgeTom = f.cortesias > 0 ? SALVIA : BERINJELA;
  const badgeNumero = f.cortesias > 0 ? f.cortesias : f.carimbos;
  const badgeRotulo =
    f.cortesias > 0
      ? f.cortesias > 1
        ? "cookies grátis"
        : "cookie grátis"
      : `de ${META_FIDELIDADE} cookies`;

  const rodape =
    f.cortesias > 0
      ? `você tem ${f.cortesias} cookie${f.cortesias > 1 ? "s" : ""} grátis!`
      : `faltam ${f.faltam} cookie${f.faltam > 1 ? "s" : ""}!`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${A}" width="${L}" height="${A}">
  <rect width="${L}" height="${A}" rx="28" fill="${PAPEL}"/>

  <text x="${L / 2}" y="58" font-size="20" fill="${BERINJELA}" text-anchor="middle" font-family="system-ui, sans-serif">@sigaseucookie</text>

  <image href="${MASCOTE_BASE64}" x="88" y="58" width="128" height="128"/>

  <g font-family="Georgia, 'Times New Roman', serif">
    <text x="500" y="152" font-size="72" font-weight="700" fill="${BERINJELA}" text-anchor="middle">Seu cookie</text>
  </g>

  <g font-family="system-ui, sans-serif">
    <rect x="230" y="190" width="440" height="46" rx="23" fill="none" stroke="${BERINJELA}" stroke-width="2.5"/>
    <text x="${L / 2}" y="220" font-size="20" fill="${BERINJELA}" text-anchor="middle">A cada ${META_FIDELIDADE} cookies, 1 de cortesia!</text>

    ${slots}

    <line x1="655" y1="252" x2="655" y2="470" stroke="${BERINJELA}" stroke-width="2" opacity="0.25"/>

    <rect x="668" y="286" width="172" height="152" rx="20" fill="${badgeTom}"/>
    <text x="754" y="382" font-size="76" font-weight="700" fill="${PAPEL}" text-anchor="middle">${badgeNumero}</text>
    <text x="754" y="414" font-size="18" fill="${PAPEL}" text-anchor="middle" opacity="0.85">${badgeRotulo}</text>

    <line x1="60" y1="500" x2="840" y2="500" stroke="${BERINJELA}" stroke-width="2" stroke-dasharray="3 7"/>

    <text x="60" y="545" font-size="21" fill="${BERINJELA}">este cartão pertence a:</text>
    <text x="292" y="545" font-size="27" font-weight="600" fill="${BERINJELA}">${escapar(nome)}</text>
    <text x="840" y="545" font-size="21" font-weight="600" fill="${BERINJELA}" text-anchor="end">${rodape}</text>
  </g>
</svg>`;
}

/** & < > viram entidade: nome com "&" quebraria o XML do SVG. */
function escapar(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
