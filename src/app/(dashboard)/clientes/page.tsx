import { Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClienteModal } from "@/components/cliente-modal";
import { ClientesLista } from "@/components/clientes-lista";
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
  const totalPorCliente: Record<string, number> = {};
  for (const pedido of pedidosDosClientes ?? []) {
    if (!pedido.cliente_id) continue;
    totalPorCliente[pedido.cliente_id] = (totalPorCliente[pedido.cliente_id] ?? 0) + 1;
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
        <ClientesLista clientes={clientes} totalPorCliente={totalPorCliente} />
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
