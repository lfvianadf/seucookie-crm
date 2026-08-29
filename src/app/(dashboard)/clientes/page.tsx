import Link from "next/link";
import { Search, Users, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClienteModal } from "@/components/cliente-modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { excluirCliente } from "@/lib/actions/clientes";
import { formatarTelefone } from "@/lib/telefone";

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
    // busca por telefone ignora a máscara: quem digita "(84) 9" precisa
    // encontrar o cliente gravado como "849..."
    const digitos = q.replace(/\D/g, "");
    query = digitos
      ? query.or(`telefone.ilike.%${digitos}%,nome.ilike.%${q}%`)
      : query.ilike("nome", `%${q}%`);
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
        action={<ClienteModal />}
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
              <div
                key={cliente.id}
                className="rounded-xl border border-border bg-white p-3"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-berinjela"
                  >
                    {cliente.nome}
                  </Link>
                  {total > 1 && <Badge tone="salvia">{total} pedidos</Badge>}
                </div>
                <p className="text-xs text-neutro-500">
                  {formatarTelefone(cliente.telefone)}
                  {cliente.endereco ? ` · ${cliente.endereco}` : ""}
                </p>
                <div className="mt-2 flex items-center justify-end gap-1 border-t border-border pt-2">
                  <ClienteModal
                    clienteExistente={cliente}
                    trigger={
                      <IconButton
                        aria-label={`Editar ${cliente.nome}`}
                        title="Editar"
                        size="toque"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </IconButton>
                    }
                  />
                  <ConfirmDeleteButton
                    itemName={cliente.nome}
                    size="toque"
                    onConfirm={excluirCliente.bind(null, cliente.id)}
                  />
                </div>
              </div>
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
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => {
                const total = totalPorCliente.get(cliente.id) ?? 0;
                return (
                  <tr
                    key={cliente.id}
                    className="group border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-berinjela">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="hover:underline underline-offset-2"
                      >
                        {cliente.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutro-700">
                      {formatarTelefone(cliente.telefone)}
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        <ClienteModal
                          clienteExistente={cliente}
                          trigger={
                            <IconButton
                              aria-label={`Editar ${cliente.nome}`}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.75} />
                            </IconButton>
                          }
                        />
                        <ConfirmDeleteButton
                          itemName={cliente.nome}
                          onConfirm={excluirCliente.bind(null, cliente.id)}
                        />
                      </div>
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
          action={!q ? <ClienteModal /> : undefined}
        />
      )}
    </div>
  );
}
