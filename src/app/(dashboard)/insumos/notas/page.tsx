import Link from "next/link";
import { Receipt, ChevronRight, Clock, CheckCircle2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NOTA_STATUS_LABEL, NOTA_STATUS_TONE } from "@/lib/nota-status";
import type { NotaFiscalStatus } from "@/lib/types/database";

const STATUS_ICON: Record<NotaFiscalStatus, typeof Clock> = {
  processando: Clock,
  aguardando_validacao: Clock,
  confirmada: CheckCircle2,
};

export default async function NotasFiscaisPage() {
  const supabase = await createClient();
  const { data: notas } = await supabase
    .from("notas_fiscais")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">
            Notas fiscais
          </h1>
          <p className="text-sm text-neutro-500">
            Upload de cupom → IA sugere os itens → você confirma cada um.
          </p>
        </div>
        <Link href="/insumos/notas/nova">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nova nota
          </Button>
        </Link>
      </div>

      {notas?.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {notas.map((nota, i) => {
            const StatusIcon = STATUS_ICON[nota.status];
            return (
              <Link
                key={nota.id}
                href={`/insumos/notas/${nota.id}`}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-berinjela-50/60 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-berinjela-50 text-neutro-500">
                  <Receipt className="h-4.5 w-4.5" strokeWidth={1.75} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-berinjela">
                    {new Date(nota.data_compra).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-neutro-500">
                    R$ {Number(nota.valor_total).toFixed(2)}
                  </p>
                </div>

                <Badge tone={NOTA_STATUS_TONE[nota.status]} className="shrink-0">
                  <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {NOTA_STATUS_LABEL[nota.status]}
                </Badge>

                <ChevronRight
                  className="h-4 w-4 shrink-0 text-neutro-300"
                  strokeWidth={1.75}
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Receipt}
          title="Nenhuma nota enviada ainda."
          action={
            <Link href="/insumos/notas/nova">
              <Button>
                <Plus className="h-4 w-4" strokeWidth={2} />
                Nova nota
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
