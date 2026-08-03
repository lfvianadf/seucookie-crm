import Link from "next/link";
import { Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NovoClienteModal } from "@/components/novo-cliente-modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

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

  const [{ data: clientes }, { data: pedidosDosClientes }] = await Promise.all([
    query,
    supabase.from("pedidos").select("cliente_id"),
  ]);

  // contagem de pedidos por cliente — feita aqui em JS porque o PostgREST
  // não faz group by; a tabela de pedidos é pequena o bastante pra isso.
  const totalPorCliente = new Map<string, number>();
  for (const pedido of pedidosDosClientes ?? []) {
    if (!pedido.cliente_id) continue;
    totalPorCliente.set(
      pedido.cliente_id,
      (totalPorCliente.get(pedido.cliente_id) ?? 0) + 1
    );
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="O telefone é a chave — é como você reencontra o cliente."
        action={<NovoClienteModal />}
      />

      <form className="mb-5" method="get">
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
        <>
        <div className="space-y-2 md:hidden">
          {clientes.map((cliente) => {
            const total = totalPorCliente.get(cliente.id) ?? 0;
            return (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.id}`}
                className="block rounded-xl border border-border bg-white p-3"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-berinjela">
                    {cliente.nome}
                  </p>
                  {total > 1 && (
                    <Badge tone="salvia">{total} pedidos</Badge>
                  )}
                </div>
                <p className="text-xs text-neutro-500">
                  {cliente.telefone}
                  {cliente.endereco ? ` · ${cliente.endereco}` : ""}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border bg-white md:block">
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutro-500">
                  Pedidos
                </th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => {
                const total = totalPorCliente.get(cliente.id) ?? 0;
                return (
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
                    <td className="px-4 py-3 text-right">
                      {total > 1 ? (
                        <Badge tone="salvia">{total}</Badge>
                      ) : (
                        <span className="text-neutro-500">{total}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
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
