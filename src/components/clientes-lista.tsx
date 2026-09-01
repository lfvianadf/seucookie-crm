"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ClienteModal } from "@/components/cliente-modal";
import { ClienteDetalheModal } from "@/components/cliente-detalhe-modal";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { IconButton } from "@/components/ui/icon-button";
import { Badge } from "@/components/ui/badge";
import { excluirCliente } from "@/lib/actions/clientes";
import { formatarTelefone } from "@/lib/telefone";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string | null;
};

export function ClientesLista({
  clientes,
  totalPorCliente,
}: {
  clientes: Cliente[];
  totalPorCliente: Record<string, number>;
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const selecionado = clientes.find((c) => c.id === selecionadoId) ?? null;

  return (
    <>
      <div className="space-y-2 md:hidden">
        {clientes.map((cliente) => {
          const total = totalPorCliente[cliente.id] ?? 0;
          return (
            <div
              key={cliente.id}
              onClick={() => setSelecionadoId(cliente.id)}
              className="cursor-pointer rounded-xl border border-border bg-white p-3 transition-colors duration-150 hover:bg-berinjela-50/60 active:bg-berinjela-50"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-berinjela">
                  {cliente.nome}
                </p>
                {total > 1 && <Badge tone="salvia">{total} pedidos</Badge>}
              </div>
              <p className="text-xs text-neutro-500">
                {formatarTelefone(cliente.telefone)}
                {cliente.endereco ? ` · ${cliente.endereco}` : ""}
              </p>
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-2 flex items-center justify-end gap-1 border-t border-border pt-2"
              >
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
              const total = totalPorCliente[cliente.id] ?? 0;
              return (
                <tr
                  key={cliente.id}
                  onClick={() => setSelecionadoId(cliente.id)}
                  className="group cursor-pointer border-b border-border transition-colors duration-150 last:border-0 hover:bg-berinjela-50/60"
                >
                  <td className="px-4 py-3 font-medium text-berinjela">
                    {cliente.nome}
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
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                    >
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

      <ClienteDetalheModal
        cliente={selecionado}
        onClose={() => setSelecionadoId(null)}
      />
    </>
  );
}
