import Link from "next/link";
import { Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NovoClienteModal } from "@/components/novo-cliente-modal";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("*")
    .order("nome", { ascending: true });

  if (q) {
    query = query.or(`telefone.ilike.%${q}%,nome.ilike.%${q}%`);
  }

  const { data: clientes } = await query;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-berinjela">Clientes</h1>
          <p className="text-sm text-neutro-500">
            O telefone é a chave — é como você reencontra o cliente.
          </p>
        </div>
        <NovoClienteModal />
      </div>

      <form className="mb-6" method="get">
        <div className="relative max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutro-400"
            strokeWidth={1.75}
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por telefone ou nome"
            className="w-full rounded-lg border border-border-strong bg-white py-2.5 pl-9 pr-3 text-sm text-berinjela outline-none transition-all duration-150 ease-out placeholder:text-berinjela-100 focus:border-rosa focus:shadow-[0_0_0_3px_var(--ring)]"
          />
        </div>
      </form>

      {clientes?.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Nome
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Telefone
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-neutro-500">
                  Endereço
                </th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 font-medium text-berinjela">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {cliente.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutro-700">{cliente.telefone}</td>
                  <td className="px-4 py-3 text-neutro-500">
                    {cliente.endereco ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={
            q
              ? "Nenhum cliente encontrado."
              : "Nenhum cliente ainda. Crie o primeiro."
          }
          action={!q ? <NovoClienteModal /> : undefined}
        />
      )}
    </div>
  );
}
