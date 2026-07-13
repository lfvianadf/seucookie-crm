"use client";

import { useRef, useState, useTransition } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { criarPedidoManual, type ItemCarrinho } from "@/lib/actions/pedidos";
import {
  buscarClientePorTelefone,
  buscarClientesPorNome,
} from "@/lib/actions/clientes";
import { Label, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  capitulo: string | null;
};

type ClienteSugestao = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string | null;
};

export function NovoPedidoForm({
  produtos,
  onSuccess,
}: {
  produtos: Produto[];
  onSuccess?: () => void;
}) {
  const [telefone, setTelefone] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [enderecoCliente, setEnderecoCliente] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sugestoesNome, setSugestoesNome] = useState<ClienteSugestao[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleTelefoneBlur() {
    if (!telefone.trim()) return;
    const cliente = await buscarClientePorTelefone(telefone.trim());
    if (cliente) {
      setNomeCliente(cliente.nome);
      setEnderecoCliente(cliente.endereco ?? "");
      setClienteEncontrado(true);
    } else {
      setClienteEncontrado(false);
    }
  }

  function handleNomeChange(value: string) {
    setNomeCliente(value);
    setClienteEncontrado(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSugestoesNome([]);
      setMostrarSugestoes(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const resultados = await buscarClientesPorNome(value);
      setSugestoesNome(resultados);
      setMostrarSugestoes(resultados.length > 0);
    }, 300);
  }

  function selecionarSugestao(cliente: ClienteSugestao) {
    setNomeCliente(cliente.nome);
    setTelefone(cliente.telefone);
    setEnderecoCliente(cliente.endereco ?? "");
    setClienteEncontrado(true);
    setMostrarSugestoes(false);
    setSugestoesNome([]);
  }

  function adicionarItem(produtoId: string) {
    setCarrinho((prev) => ({ ...prev, [produtoId]: (prev[produtoId] ?? 0) + 1 }));
  }

  function removerItem(produtoId: string) {
    setCarrinho((prev) => {
      const atual = prev[produtoId] ?? 0;
      if (atual <= 1) {
        const resto = { ...prev };
        delete resto[produtoId];
        return resto;
      }
      return { ...prev, [produtoId]: atual - 1 };
    });
  }

  const itensCarrinho = Object.entries(carrinho)
    .map(([produtoId, quantidade]) => {
      const produto = produtos.find((p) => p.id === produtoId);
      return produto ? { produto, quantidade } : null;
    })
    .filter((item): item is { produto: Produto; quantidade: number } => !!item);

  const total = itensCarrinho.reduce(
    (soma, item) => soma + item.produto.preco * item.quantidade,
    0
  );

  function handleSubmit() {
    setErro(null);

    if (!nomeCliente.trim() || !telefone.trim()) {
      setErro("Nome e telefone do cliente são obrigatórios.");
      return;
    }
    if (itensCarrinho.length === 0) {
      setErro("Adicione ao menos um item ao pedido.");
      return;
    }

    const itens: ItemCarrinho[] = itensCarrinho.map((item) => ({
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
    }));

    startTransition(async () => {
      try {
        await criarPedidoManual({
          clienteNome: nomeCliente.trim(),
          clienteTelefone: telefone.trim(),
          clienteEndereco: enderecoCliente.trim() || undefined,
          itens,
          observacoes: observacoes.trim() || undefined,
        });
        onSuccess?.();
      } catch {
        setErro("Não foi possível salvar o pedido. Tente novamente.");
      }
    });
  }

  const capitulos = Array.from(
    new Set(produtos.map((p) => p.capitulo ?? "Outros"))
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-berinjela">Cliente</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pedido-telefone">Telefone</Label>
              <Input
                id="pedido-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                onBlur={handleTelefoneBlur}
                inputMode="tel"
                placeholder="(11) 90000-0000"
                autoFocus
              />
            </div>
            <div className="relative">
              <Label htmlFor="pedido-nome">Nome</Label>
              <Input
                id="pedido-nome"
                value={nomeCliente}
                onChange={(e) => handleNomeChange(e.target.value)}
                onFocus={() => sugestoesNome.length > 0 && setMostrarSugestoes(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
                autoComplete="off"
              />
              {mostrarSugestoes && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-white shadow-modal">
                  {sugestoesNome.map((cliente) => (
                    <li key={cliente.id}>
                      <button
                        type="button"
                        onMouseDown={() => selecionarSugestao(cliente)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-berinjela-50"
                      >
                        <span className="font-medium text-berinjela">{cliente.nome}</span>
                        <span className="text-xs text-neutro-500">{cliente.telefone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pedido-endereco">Endereço (opcional)</Label>
              <Input
                id="pedido-endereco"
                value={enderecoCliente}
                onChange={(e) => setEnderecoCliente(e.target.value)}
              />
            </div>
          </div>
          {clienteEncontrado && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-salvia-text">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Cliente encontrado.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-berinjela">Itens</h2>
          {capitulos.map((capitulo) => (
            <div key={capitulo} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutro-500">
                {capitulo}
              </p>
              <div className="flex flex-wrap gap-2">
                {produtos
                  .filter((p) => (p.capitulo ?? "Outros") === capitulo)
                  .map((produto) => {
                    const qtd = carrinho[produto.id] ?? 0;
                    return (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => adicionarItem(produto.id)}
                        className={`min-h-11 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 ease-out ${
                          qtd > 0
                            ? "border-rosa bg-rosa text-white shadow-sm"
                            : "border-border-strong bg-white text-berinjela hover:border-rosa hover:-translate-y-px"
                        }`}
                      >
                        {produto.nome} · R$ {produto.preco.toFixed(2)}
                        {qtd > 0 && ` · ${qtd}x`}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          {!produtos.length && (
            <p className="text-sm text-neutro-500">
              Nenhum produto disponível. Cadastre no Cardápio primeiro.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="sticky top-0 rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-berinjela">Resumo</h2>

          {itensCarrinho.length === 0 && (
            <p className="text-sm text-neutro-500">Nenhum item selecionado.</p>
          )}

          <ul className="mb-4 space-y-2">
            {itensCarrinho.map((item) => (
              <li
                key={item.produto.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-berinjela">
                  {item.quantidade}x {item.produto.nome}
                </span>
                <button
                  type="button"
                  onClick={() => removerItem(item.produto.id)}
                  aria-label={`Remover ${item.produto.nome}`}
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutro-400 transition-colors duration-150 hover:bg-erro-bg hover:text-erro"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>

          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações (opcional)"
            rows={2}
            className="mb-4"
          />

          <div className="mb-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-berinjela">Total</span>
            <span className="text-base font-semibold text-berinjela">
              R$ {total.toFixed(2)}
            </span>
          </div>

          {erro && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-erro-bg px-3 py-2.5 text-xs text-erro-text">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {erro}
            </div>
          )}

          <Button onClick={handleSubmit} loading={isPending} className="w-full">
            Criar pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
