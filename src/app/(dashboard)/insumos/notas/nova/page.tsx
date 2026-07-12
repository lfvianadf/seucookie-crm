import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { criarNotaFiscal } from "@/lib/actions/notas";
import { NotaUploadField } from "@/components/nota-upload-field";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function NovaNotaFiscalPage() {
  return (
    <div className="max-w-md">
      <Link
        href="/insumos/notas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutro-500 transition-colors duration-150 hover:text-berinjela"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        Notas fiscais
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-berinjela">
        Nova nota fiscal
      </h1>
      <p className="mb-6 text-sm text-neutro-500">
        Tire uma foto do cupom. A IA sugere os itens — você confirma cada um
        na próxima tela antes de qualquer coisa entrar no estoque.
      </p>

      <form
        action={criarNotaFiscal}
        className="rounded-xl border border-border bg-white p-5"
      >
        <FieldGroup className="mb-6">
          <NotaUploadField />

          <div>
            <Label htmlFor="data_compra">Data da compra</Label>
            <Input
              id="data_compra"
              type="date"
              name="data_compra"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </FieldGroup>

        <p className="mb-6 text-xs text-neutro-500">
          O valor total é calculado automaticamente somando os itens que a IA
          encontrar na foto — você confirma cada um na próxima tela.
        </p>

        <Button type="submit" className="w-full">
          Enviar e processar
        </Button>
      </form>
    </div>
  );
}
