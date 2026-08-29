import { Heart } from "lucide-react";
import { META_FIDELIDADE, type Fidelidade } from "@/lib/fidelidade";
import { cartaoFidelidadeSvg } from "@/lib/cartao-svg";

/**
 * O cartão de papel traduzido pra tela.
 *
 * Mantém a leitura de relance do original — dez círculos que enchem — mas sem
 * a textura e a manuscrita da marca: aqui é ferramenta, não vitrine
 * (seção 7 do doc). Os carimbos usam berinjela, e o sálvia só aparece quando
 * há cortesia a entregar, que é a única coisa que exige ação.
 */
export function CartaoFidelidade({
  nome,
  fidelidade,
  compacto = false,
}: {
  nome: string;
  fidelidade: Fidelidade;
  compacto?: boolean;
}) {
  const { cortesias } = fidelidade;
  const temCortesia = cortesias > 0;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-berinjela">{nome}</p>
          <p className="mt-0.5 text-xs text-neutro-500">
            {temCortesia
              ? `${cortesias} cortesia${cortesias > 1 ? "s" : ""} a entregar`
              : `Faltam ${fidelidade.faltam} pro próximo cookie grátis`}
          </p>
        </div>

        {temCortesia && (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-salvia-bg px-2 py-1 text-xs font-medium text-salvia-text">
            <Heart className="h-3 w-3" strokeWidth={2} />
            {cortesias > 1 ? `${cortesias}x grátis` : "1 grátis"}
          </span>
        )}
      </div>

      {/* o mesmo SVG que vai pro cliente — um desenho só, pra tela e
          WhatsApp nunca mostrarem coisas diferentes */}
      <div
        className={compacto ? "max-w-sm" : ""}
        dangerouslySetInnerHTML={{
          __html: cartaoFidelidadeSvg(nome, fidelidade).replace(
            /width="\d+" height="\d+"/,
            'width="100%" height="auto"'
          ),
        }}
      />

      <p className="mt-3 text-xs text-neutro-500">
        {fidelidade.saldo} cookie{fidelidade.saldo === 1 ? "" : "s"} comprado
        {fidelidade.saldo === 1 ? "" : "s"} · a cada {META_FIDELIDADE}, 1 de
        cortesia
      </p>
    </div>
  );
}
