import { Stamp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcularFidelidade, META_FIDELIDADE } from "@/lib/fidelidade";
import { CartaoFidelidade } from "@/components/cartao-fidelidade";
import { FidelidadeAcoes } from "@/components/fidelidade-acoes";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function FidelidadePage() {
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("fidelidade_clientes")
    .select("*")
    .gt("cookies_no_cartao", 0)
    .order("cookies_no_cartao", { ascending: false });

  const lista = (clientes ?? []).map((c) => ({
    ...c,
    fidelidade: calcularFidelidade(Number(c.cookies_no_cartao)),
  }));

  // quem já fechou o cartão vem primeiro: é o único grupo que exige ação
  const comCortesia = lista.filter((c) => c.fidelidade.cortesias > 0);
  const quaseLa = lista.filter(
    (c) => c.fidelidade.cortesias === 0 && c.fidelidade.faltam <= 3
  );
  const demais = lista.filter(
    (c) => c.fidelidade.cortesias === 0 && c.fidelidade.faltam > 3
  );

  return (
    <div>
      <PageHeader
        title="Fidelidade"
        description={`A cada ${META_FIDELIDADE} cookies comprados, 1 de cortesia.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          label="Cortesias a entregar"
          value={String(comCortesia.reduce((s, c) => s + c.fidelidade.cortesias, 0))}
          icon={Stamp}
          tone={comCortesia.length > 0 ? "atencao" : "neutral"}
          hint={`${comCortesia.length} cliente${comCortesia.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Quase lá"
          value={String(quaseLa.length)}
          icon={Stamp}
          hint="faltam 3 ou menos"
        />
        <StatTile
          label="Com cartão aberto"
          value={String(lista.length)}
          icon={Stamp}
          hint="já compraram ao menos 1"
        />
      </div>

      {lista.length ? (
        <div className="space-y-6">
          <Secao titulo="Cortesia disponível" clientes={comCortesia} />
          <Secao titulo="Quase fechando" clientes={quaseLa} />
          <Secao titulo="Cartão em andamento" clientes={demais} />
        </div>
      ) : (
        <EmptyState
          icon={Stamp}
          title="Nenhum cliente com cookies comprados ainda."
        />
      )}
    </div>
  );
}

type ClienteFidelidade = {
  cliente_id: string;
  nome: string;
  telefone: string;
  fidelidade: ReturnType<typeof calcularFidelidade>;
};

function Secao({
  titulo,
  clientes,
}: {
  titulo: string;
  clientes: ClienteFidelidade[];
}) {
  if (clientes.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-berinjela">{titulo}</h2>
        <span className="text-xs text-neutro-500">{clientes.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {clientes.map((c) => (
          <div key={c.cliente_id} className="space-y-2">
            <CartaoFidelidade nome={c.nome} fidelidade={c.fidelidade} />
            <FidelidadeAcoes
              clienteId={c.cliente_id}
              nome={c.nome}
              telefone={c.telefone}
              saldo={c.fidelidade.saldo}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
