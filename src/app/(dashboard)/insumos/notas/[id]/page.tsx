import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { reprocessarNota } from "@/lib/actions/notas";
import { ItemValidacaoForm } from "@/components/item-validacao-form";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { NOTA_STATUS_LABEL, NOTA_STATUS_TONE } from "@/lib/nota-status";

export default async function NotaFiscalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: nota } = await supabase
    .from("notas_fiscais")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!nota) notFound();

  const [{ data: itens }, { data: insumos }] = await Promise.all([
    supabase.from("nota_itens").select("*").eq("nota_id", id),
    supabase.from("insumos").select("id, nome, unidade_base").order("nome"),
  ]);

  const { data: fotoAssinada } = nota.foto_url
    ? await supabase.storage
        .from("notas-fiscais")
        .createSignedUrl(nota.foto_url, 60 * 60)
    : { data: null };

  const pendentes = itens?.filter((i) => !i.validado) ?? [];
  const validados = itens?.filter((i) => i.validado) ?? [];
  const total = itens?.length ?? 0;

  return (
    <div>
      <Link
        href="/insumos/notas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutro-500 transition-colors duration-150 hover:text-berinjela"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        Notas fiscais
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-berinjela">
              {new Date(nota.data_compra).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </h1>
            <Badge tone={NOTA_STATUS_TONE[nota.status]}>
              {nota.status === "confirmada" ? (
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              ) : (
                <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {NOTA_STATUS_LABEL[nota.status]}
            </Badge>
          </div>
          <p className="text-sm text-neutro-500">
            R$ {Number(nota.valor_total).toFixed(2)}
            {total > 0 && ` · ${validados.length}/${total} itens validados`}
          </p>
        </div>

        {nota.status === "processando" && (
          <form action={reprocessarNota.bind(null, nota.id)}>
            <SubmitButton variant="secondary" size="sm">
              Reprocessar
            </SubmitButton>
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {nota.status === "processando" && (
            <div className="rounded-xl border border-border bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 animate-pulse items-center justify-center rounded-full bg-atencao-bg text-atencao">
                <Clock className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <p className="text-sm text-neutro-500">
                Processando a nota com IA... atualize a página em alguns
                segundos.
              </p>
            </div>
          )}

          {pendentes.length > 0 && (
            <div className="mb-6 space-y-3">
              <h2 className="text-sm font-semibold text-berinjela">
                Pendentes de validação ({pendentes.length})
              </h2>
              {pendentes.map((item) => (
                <ItemValidacaoForm
                  key={item.id}
                  item={item}
                  insumosIniciais={insumos ?? []}
                />
              ))}
            </div>
          )}

          {validados.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-berinjela">
                Validados ({validados.length})
              </h2>
              {validados.map((item) => (
                <ItemValidacaoForm
                  key={item.id}
                  item={item}
                  insumosIniciais={insumos ?? []}
                />
              ))}
            </div>
          )}

          {nota.status !== "processando" && !itens?.length && (
            <div className="rounded-xl border border-border bg-white px-6 py-12 text-center text-sm text-neutro-500">
              A IA não encontrou itens nessa nota. Isso pode acontecer com
              fotos tortas ou cupons apagados.
            </div>
          )}
        </div>

        <div>
          {fotoAssinada?.signedUrl && (
            <div className="sticky top-0 overflow-hidden rounded-xl border border-border bg-white">
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src={fotoAssinada.signedUrl}
                  alt="Foto da nota fiscal"
                  fill
                  sizes="360px"
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
