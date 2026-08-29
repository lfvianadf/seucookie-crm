import { META_FIDELIDADE, type Fidelidade } from "@/lib/fidelidade";
import { MASCOTE_BASE64 } from "@/lib/assets/mascote-base64";

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

/** Cookie carimbado: círculo cheio com gotas vazadas. */
function cookieCarimbado(cx: number, cy: number, r: number) {
  // espalhadas até a borda e maiores que no primeiro esboço, senão parecem
  // furos no meio do biscoito em vez de pedaços de chocolate
  const gotas = [
    [-0.46, -0.44, 0.19],
    [0.34, -0.5, 0.16],
    [-0.02, -0.14, 0.2],
    [0.52, 0.06, 0.17],
    [-0.5, 0.14, 0.18],
    [0.16, 0.46, 0.19],
    [-0.24, 0.54, 0.15],
    [0.56, 0.44, 0.13],
    [-0.62, -0.06, 0.12],
  ];

  const furos = gotas
    .map(
      ([dx, dy, dr]) =>
        `<circle cx="${(cx + dx * r).toFixed(1)}" cy="${(cy + dy * r).toFixed(
          1
        )}" r="${(dr * r).toFixed(1)}" fill="${PAPEL}"/>`
    )
    .join("");

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${BERINJELA}"/>${furos}`;
}

export function cartaoFidelidadeSvg(nome: string, f: Fidelidade) {
  const L = 900;
  const A = 580;

  // dois cookies por linha de 5, como no cartão de papel
  const raioSlot = 46;
  const gapX = 122;
  const gapY = 122;
  const x0 = 92;
  const y0 = 300;

  const slots = Array.from({ length: META_FIDELIDADE }, (_, i) => {
    const linha = Math.floor(i / 5);
    const col = i % 5;
    const cx = x0 + col * gapX;
    const cy = y0 + linha * gapY;
    const preenchido = i < f.carimbos;

    const numero = `<text x="${cx}" y="${cy - raioSlot + 20}" font-size="19" font-weight="600" fill="${
      preenchido ? BERINJELA : APAGADO
    }" text-anchor="middle">${i + 1}</text>`;

    const contorno = `<circle cx="${cx}" cy="${cy}" r="${raioSlot}" fill="none" stroke="${
      preenchido ? BERINJELA : APAGADO
    }" stroke-width="2.5"/>`;

    const miolo = preenchido ? cookieCarimbado(cx, cy + 6, raioSlot * 0.62) : "";

    return contorno + numero + miolo;
  }).join("");

  const selo =
    f.cortesias > 0
      ? `<text x="742" y="360" font-size="21" font-weight="700" fill="${BERINJELA}" text-anchor="middle">cortesia</text>
         <text x="742" y="386" font-size="21" font-weight="700" fill="${BERINJELA}" text-anchor="middle">liberada!</text>`
      : `<text x="742" y="352" font-size="19" fill="${BERINJELA}" text-anchor="middle">1 cookie</text>
         <text x="742" y="378" font-size="19" fill="${BERINJELA}" text-anchor="middle">de cortesia</text>`;

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

    <line x1="655" y1="255" x2="655" y2="468" stroke="${BERINJELA}" stroke-width="2"/>
    <circle cx="742" cy="362" r="88" fill="none" stroke="${BERINJELA}" stroke-width="2.5" stroke-dasharray="7 5"/>
    ${selo}

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
