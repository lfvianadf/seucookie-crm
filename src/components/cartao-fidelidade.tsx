import { Cookie, Heart } from "lucide-react";
import { META_FIDELIDADE, type Fidelidade } from "@/lib/fidelidade";

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
  const { carimbos, cortesias } = fidelidade;
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

      {/* dez círculos, como no cartão de papel: dá pra ler o progresso sem
          processar número nenhum */}
      <div
        className={`grid grid-cols-5 gap-2 ${compacto ? "max-w-56" : "max-w-72"}`}
      >
        {Array.from({ length: META_FIDELIDADE }).map((_, i) => {
          const preenchido = i < carimbos;
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-full border text-xs font-medium ${
                preenchido
                  ? "border-berinjela bg-berinjela text-white"
                  : "border-border-strong text-neutro-300"
              }`}
            >
              {preenchido ? (
                <Cookie className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                i + 1
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-neutro-500">
        {fidelidade.saldo} cookie{fidelidade.saldo === 1 ? "" : "s"} comprado
        {fidelidade.saldo === 1 ? "" : "s"} · a cada {META_FIDELIDADE}, 1 de
        cortesia
      </p>
    </div>
  );
}
