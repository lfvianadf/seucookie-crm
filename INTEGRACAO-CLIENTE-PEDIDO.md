# Integração: criar cliente e pedido pelo site

> Só o fluxo de checkout — achar/criar cliente e criar o pedido. Pra buscar o cardápio e
> outros detalhes, ver `INTEGRACAO-SITE.md`.

## Setup

```bash
npm install @supabase/supabase-js
```

```ts
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://syomsglwyummyclilbzv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5b21zZ2x3eXVtbXljbGlsYnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODI5ODksImV4cCI6MjA5OTM1ODk4OX0.YD66-lrlhgcc20-E5R1JILcQWL59n61zFZSto5XE_Sg
```

A anon key é pública (protegida por RLS no banco) — pode ir no bundle do site sem
problema. Nunca use a `service_role` key aqui.

---

## Passo 1 — achar ou criar o cliente

Busca **sempre via a function `buscar_cliente_por_telefone`**, nunca com
`.from("clientes").select(...)` direto — a tabela não libera `select` pro anônimo (só
`insert`), então um select direto sempre volta vazio.

```ts
type Cliente = { id: string; nome: string; endereco: string | null };

async function encontrarOuCriarCliente(
  nome: string,
  telefone: string,
  endereco?: string
): Promise<Cliente> {
  const { data: encontrados, error: buscaError } = await supabase.rpc(
    "buscar_cliente_por_telefone",
    { p_telefone: telefone }
  );
  if (buscaError) throw buscaError;

  if (encontrados && encontrados.length > 0) {
    return encontrados[0];
  }

  const { data: novo, error: criaError } = await supabase
    .from("clientes")
    .insert({ nome, telefone, endereco: endereco || null })
    .select("id, nome, endereco")
    .single();

  if (criaError) throw criaError;
  return novo;
}
```

## Passo 2 — criar o pedido

`origem` **tem que ser exatamente `"site"`** (string) — é a condição que libera o
insert pro anônimo.

```ts
type ItemCarrinho = { produtoId: string; nome: string; quantidade: number; preco: number };

async function criarPedido(
  cliente: Cliente,
  itens: ItemCarrinho[],
  observacoes?: string
) {
  const valorTotal = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: cliente.id,
      origem: "site",
      status: "novo",
      valor_total: valorTotal,
      observacoes: observacoes || null,
    })
    .select("id")
    .single();

  if (pedidoError) throw pedidoError;

  const { error: itensError } = await supabase.from("pedido_itens").insert(
    itens.map((item) => ({
      pedido_id: pedido.id,
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      preco_unitario: item.preco, // congela o preço no momento da compra
    }))
  );

  if (itensError) throw itensError;

  return pedido;
}
```

## Juntando os dois

```ts
async function finalizarCheckout(
  nome: string,
  telefone: string,
  endereco: string,
  itens: ItemCarrinho[],
  observacoes?: string
) {
  const cliente = await encontrarOuCriarCliente(nome, telefone, endereco);
  const pedido = await criarPedido(cliente, itens, observacoes);
  return pedido; // usar pedido.id pra montar a mensagem do WhatsApp
}
```

## Erros esperados

- **`new row violates row-level security policy`** em `pedidos`: confere se `origem`
  está literalmente `"site"` (não `"manual"`, não `undefined`).
- **`new row violates row-level security policy`** em `clientes`: isso não deveria mais
  acontecer — se acontecer, avisa o Luís, é policy quebrada no banco, não é bug no site.
- **`buscar_cliente_por_telefone` retorna erro de permissão**: a function precisa de
  `grant execute` pro role `anon` — também é ajuste do lado do banco, não do site.
