import { Truck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function EntregasPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-berinjela">Entregas</h1>
      <p className="mb-6 text-sm text-neutro-500">Fase 5 — ainda não construída.</p>
      <EmptyState
        icon={Truck}
        title="Endereço + status + quando. Entra depois de cardápio, pedidos e insumos estarem prontos."
      />
    </div>
  );
}
