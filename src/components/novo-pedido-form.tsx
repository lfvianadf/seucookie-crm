"use client";

import { useRef, useState, useTransition } from "react";
import { X, AlertCircle, CheckCircle2, Minus, Plus } from "lucide-react";
import { criarPedidoManual, type ItemCarrinho } from "@/lib/actions/pedidos";
import {
  buscarClientePorTelefone,
  buscarClientesPorNome,
} from "@/lib/actions/clientes";
import { Label, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { calcularPrecoBox, totalEscolhido } from "@/lib/preco-box";
import type { TipoProduto } from "@/lib/types/database";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  capitulo: string | null;
  tipo_produto: TipoProduto;
  qtd_cookies_box: number | null;
};

type ClienteSugestao = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string | null;
};

type BoxCookies = Record<
  string,
  { id: string; nome: string; preco: number; acrescimo_box: number }[]
>;

type CaixaCarrinho = {
  tempId: string;
  produtoId: string;
  nome: string;
  preco: number;
  composicao: { cookieId: string; nome: string; quantidade: number }[];
};

export function NovoPedidoForm({
  produtos,
  boxCookies,
  onSuccess,
}: {
  produtos: Produto[];
  boxCookies: BoxCookies;
  onSuccess?: () => void;
}) {
  const [telefone, setTelefone] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [enderecoCliente, setEnderecoCliente] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [caixas, setCaixas] = useState<CaixaCarrinho[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sugestoesNome, setSugestoesNome] = useState<ClienteSugestao[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [caixaEmMontagem, setCaixaEmMontagem] = useState<Produto | null>(null);
  const [composicaoEmMontagem, setComposicaoEmMontagem] = useState<
    Record<string, number>
  >({});

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

  function adicionarItem(produto: Produto) {
    if (produto.tipo_produto === "box") {
      setCaixaEmMontagem(produto);
      setComposicaoEmMontagem({});
      return;
    }
    setCarrinho((prev) => ({ ...prev, [produto.id]: (prev[produto.id] ?? 0) + 1 }));
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

  function ajustarComposicao(cookieId: string, delta: number) {
    setComposicaoEmMontagem((prev) => {
      const atual = (prev[cookieId] ?? 0) + delta;
      if (atual <= 0) {
        const resto = { ...prev };
        delete resto[cookieId];
        return resto;
      }
      return { ...prev, [cookieId]: atual };
    });
  }

  function cancelarMontagem() {
    setCaixaEmMontagem(null);
    setComposicaoEmMontagem({});
  }

  function confirmarMontagem() {
    if (!caixaEmMontagem) return;
    const cookiesDaBox = boxCookies[caixaEmMontagem.id] ?? [];
    const composicao = Object.entries(composicaoEmMontagem)
      .filter(([, qtd]) => qtd > 0)
      .map(([cookieId, quantidade]) => ({
        cookieId,
        nome: cookiesDaBox.find((c) => c.id === cookieId)?.nome ?? "—",
        quantidade,
      }));

    if (composicao.length === 0) {
      setErro("Escolha ao menos um cookie pra montar a box.");
      return;
    }

    const exigidos = caixaEmMontagem.qtd_cookies_box;
    if (exigidos && escolhidosNaMontagem !== exigidos) {
      setErro(
        `Essa box leva ${exigidos} cookies — você escolheu ${escolhidosNaMontagem}.`
      );
      return;
    }

    setCaixas((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        produtoId: caixaEmMontagem.id,
        nome: caixaEmMontagem.nome,
        // congela o preço já com os acréscimos — se o acréscimo mudar
        // depois, este pedido mantém o valor da época
        preco: precoDaMontagem.total,
        composicao,
      },
    ]);
    setErro(null);
    cancelarMontagem();
  }

  function removerCaixa(tempId: string) {
    setCaixas((prev) => prev.filter((c) => c.tempId !== tempId));
  }

  // preço e contagem da box em montagem, recalculados a cada toque
  const escolhidosNaMontagem = totalEscolhido(composicaoEmMontagem);
  const exigidosNaMontagem = caixaEmMontagem?.qtd_cookies_box ?? null;
  const precoDaMontagem = calcularPrecoBox(
    caixaEmMontagem?.preco ?? 0,
    Object.entries(composicaoEmMontagem).map(([cookieId, quantidade]) => ({
      cookieId,
      quantidade,
    })),
    caixaEmMontagem ? (boxCookies[caixaEmMontagem.id] ?? []) : []
  );
  const montagemCompleta =
    escolhidosNaMontagem > 0 &&
    (!exigidosNaMontagem || escolhidosNaMontagem === exigidosNaMontagem);

  const itensCarrinho = Object.entries(carrinho)
    .map(([produtoId, quantidade]) => {
      const produto = produtos.find((p) => p.id === produtoId);
      return produto ? { produto, quantidade } : null;
    })
    .filter((item): item is { produto: Produto; quantidade: number } => !!item);

  const totalCookies = itensCarrinho.reduce(
    (soma, item) => soma + item.produto.preco * item.quantidade,
    0
  );
  const totalCaixas = caixas.reduce((soma, c) => soma + c.preco, 0);
  const total = totalCookies + totalCaixas;

  function handleSubmit() {
    setErro(null);

    if (!nomeCliente.trim() || !telefone.trim()) {
      setErro("Nome e telefone do cliente são obrigatórios.");
      return;
    }
    if (itensCarrinho.length === 0 && caixas.length === 0) {
      setErro("Adicione ao menos um item ao pedido.");
      return;
    }

    const itens: ItemCarrinho[] = [
      ...itensCarrinho.map((item) => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco,
      })),
      ...caixas.map((c) => ({
        produto_id: c.produtoId,
        quantidade: 1,
        preco_unitario: c.preco,
        composicao: c.composicao.map((item) => ({
          cookieProdutoId: item.cookieId,
          quantidade: item.quantidade,
        })),
      })),
    ];

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
                    const ehBox = produto.tipo_produto === "box";
                    return (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => adicionarItem(produto)}
                        className={`min-h-11 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 ease-out ${
                          qtd > 0
                            ? "border-rosa bg-rosa text-white shadow-sm"
                            : "border-border-strong bg-white text-berinjela hover:border-rosa hover:-translate-y-px"
                        }`}
                      >
                        {ehBox && "📦 "}
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

          {caixaEmMontagem && (
            <div className="mt-4 rounded-lg border border-rosa/30 bg-rosa/5 p-3">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-berinjela">
                  Montar {caixaEmMontagem.nome}
                </p>
                {exigidosNaMontagem && (
                  <span
                    className={`text-xs font-medium ${
                      escolhidosNaMontagem === exigidosNaMontagem
                        ? "text-salvia-text"
                        : "text-neutro-500"
                    }`}
                  >
                    {escolhidosNaMontagem} de {exigidosNaMontagem}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {(boxCookies[caixaEmMontagem.id] ?? []).map((cookie) => (
                  <div key={cookie.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-berinjela">
                      {cookie.nome}
                      {cookie.acrescimo_box > 0 && (
                        <span className="ml-1 text-xs text-neutro-500">
                          +R$ {Number(cookie.acrescimo_box).toFixed(2)}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => ajustarComposicao(cookie.id, -1)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border-strong text-neutro-500 hover:bg-berinjela-50"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <span className="w-5 text-center text-sm font-medium text-berinjela">
                        {composicaoEmMontagem[cookie.id] ?? 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => ajustarComposicao(cookie.id, 1)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border-strong text-neutro-500 hover:bg-berinjela-50"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
                {!(boxCookies[caixaEmMontagem.id] ?? []).length && (
                  <p className="text-xs text-neutro-500">
                    Essa box ainda não tem cookies configurados. Edite ela no
                    Cardápio primeiro.
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-rosa/20 pt-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-berinjela">
                    R$ {precoDaMontagem.total.toFixed(2)}
                  </p>
                  {precoDaMontagem.acrescimos > 0 && (
                    <p className="text-xs text-neutro-500">
                      R$ {precoDaMontagem.precoBase.toFixed(2)} base + R${" "}
                      {precoDaMontagem.acrescimos.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="ghost" onClick={cancelarMontagem}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmarMontagem}
                    disabled={!montagemCompleta}
                  >
                    Adicionar caixa
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="sticky top-0 rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-berinjela">Resumo</h2>

          {itensCarrinho.length === 0 && caixas.length === 0 && (
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
            {caixas.map((caixa) => (
              <li key={caixa.tempId} className="text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-berinjela">📦 {caixa.nome}</span>
                  <button
                    type="button"
                    onClick={() => removerCaixa(caixa.tempId)}
                    aria-label={`Remover ${caixa.nome}`}
                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutro-400 transition-colors duration-150 hover:bg-erro-bg hover:text-erro"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                <p className="text-xs text-neutro-500">
                  {caixa.composicao
                    .map((c) => `${c.quantidade}x ${c.nome}`)
                    .join(", ")}
                </p>
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
