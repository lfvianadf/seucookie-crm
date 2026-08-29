import { META_FIDELIDADE, type Fidelidade } from "@/lib/fidelidade";
import { LOGO_BASE64 } from "@/lib/assets/logo-base64";
import { COOKIE_CARIMBO_BASE64 } from "@/lib/assets/cookie-carimbo-base64";

/**
 * Cartão fidelidade como SVG, para o cliente receber no WhatsApp.
 *
 * Só quatro elementos: @, logo, os dez círculos e o rodapé. A contagem
 * escrita saiu de propósito — os círculos preenchidos já dizem quanto falta,
 * e repetir em número era ruído.
 *
 * Diferente do resto do CRM, aqui a marca aparece inteira: isto vai pro
 * cliente, não pra tela de trabalho.
 */

const PAPEL = "#F5F1E8";
const BERINJELA = "#43303B";
const APAGADO = "#C4BBBE";
const SALVIA = "#7D9B76";

export function cartaoFidelidadeSvg(nome: string, f: Fidelidade) {
  const L = 900;
  const A = 620;

  const raioSlot = 48;
  const gapX = 152;
  const gapY = 132;
  const x0 = 146;
  const y0 = 330;

  // Cartão recém-fechado tem carimbos = 0 (10 % 10), mas o cliente comprou
  // os dez — mostrar o cartão vazio pareceria que o progresso sumiu.
  const preenchidos =
    f.cortesias > 0 && f.carimbos === 0 ? META_FIDELIDADE : f.carimbos;

  const slots = Array.from({ length: META_FIDELIDADE }, (_, i) => {
    const cx = x0 + (i % 5) * gapX;
    const cy = y0 + Math.floor(i / 5) * gapY;
    const preenchido = i < preenchidos;

    if (!preenchido) {
      return `<circle cx="${cx}" cy="${cy}" r="${raioSlot}" fill="none" stroke="${APAGADO}" stroke-width="2.5"/>
        <text x="${cx}" y="${cy + 8}" font-size="24" font-weight="500" fill="${APAGADO}" text-anchor="middle">${i + 1}</text>`;
    }

    // fundo berinjela desenhado aqui e o cookie (sem fundo próprio) por
    // cima, menor que o círculo, pra respirar dentro do slot
    const lado = raioSlot * 1.5;
    return `<circle cx="${cx}" cy="${cy}" r="${raioSlot}" fill="${BERINJELA}"/>
      <image href="${COOKIE_CARIMBO_BASE64}" x="${cx - lado / 2}" y="${
        cy - lado / 2
      }" width="${lado}" height="${lado}" preserveAspectRatio="xMidYMid meet"/>`;
  }).join("");

  const rodapeDireita =
    f.cortesias > 0
      ? `${f.cortesias} cookie${f.cortesias > 1 ? "s" : ""} de cortesia!`
      : `faltam ${f.faltam} cookie${f.faltam > 1 ? "s" : ""}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${A}" width="${L}" height="${A}" font-family="system-ui, -apple-system, sans-serif">
  <rect width="${L}" height="${A}" rx="30" fill="${PAPEL}"/>

  <text x="${L / 2}" y="62" font-size="21" fill="${BERINJELA}" text-anchor="middle" opacity="0.65">@sigaseucookie</text>

  <image href="${LOGO_BASE64}" x="${L / 2 - 110}" y="70" width="220" height="180" preserveAspectRatio="xMidYMid meet"/>

  ${slots}

  <line x1="70" y1="530" x2="${L - 70}" y2="530" stroke="${BERINJELA}" stroke-width="2" stroke-dasharray="2 8" opacity="0.4"/>

  <text x="70" y="578" font-size="30" font-weight="600" fill="${BERINJELA}">${escapar(nome)}</text>
  <text x="${L - 70}" y="578" font-size="22" fill="${
    f.cortesias > 0 ? SALVIA : BERINJELA
  }" text-anchor="end" opacity="${f.cortesias > 0 ? 1 : 0.7}">${rodapeDireita}</text>
</svg>`;
}

/** & < > viram entidade: nome com "&" quebraria o XML do SVG. */
function escapar(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
