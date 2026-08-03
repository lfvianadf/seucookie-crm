import { Skeleton, SkeletonRow, SkeletonCard } from "@/components/ui/skeleton";

/**
 * Esqueleto genérico de página, usado pelos loading.tsx de cada rota.
 * Existe pra que trocar de aba mostre a estrutura na hora, em vez de deixar
 * a tela anterior congelada enquanto o servidor busca os dados.
 */
export function PageSkeleton({
  variant = "tabela",
}: {
  variant?: "tabela" | "cards" | "kanban";
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {variant === "cards" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {variant === "tabela" && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {variant === "kanban" && (
        <div className="flex gap-4 overflow-hidden pb-4">
          {Array.from({ length: 4 }).map((_, coluna) => (
            <div
              key={coluna}
              className="w-72 shrink-0 rounded-xl bg-berinjela-50/50 p-2"
            >
              <Skeleton className="mb-3 ml-1 h-4 w-24" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, card) => (
                  <div
                    key={card}
                    className="space-y-2 rounded-lg border border-border bg-white p-3"
                  >
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
