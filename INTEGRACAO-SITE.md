# Integração do site com o banco (Supabase)

> Para quem está construindo o **site público** (projeto separado deste CRM). Os dois
> compartilham o mesmo banco Supabase, mas são aplicações diferentes — o site só lê o
> cardápio e cria pedidos; toda a gestão (produção, insumos, status de pedido) acontece
> aqui no CRM.

---

## 1. Variáveis de ambiente

O site usa a **anon key** — é uma chave pública, protegida por Row Level Security (RLS)
no banco, então pode ir no `.env` do site e no bundle do frontend sem problema. **Nunca
use a `service_role` key no site** (essa aí sim é secreta e só o CRM/backend deve ter).

```bash
NEXT_PUBLIC_SUPABASE_URL=https://syomsglwyummyclilbzv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5b21zZ2x3eXVtbXljbGlsYnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODI5ODksImV4cCI6MjA5OTM1ODk4OX0.YD66-lrlhgcc20-E5R1JILcQWL59n61zFZSto5XE_Sg
```

(Prefixo `NEXT_PUBLIC_` assumindo Next.js — ajuste a convenção se o site for outro
framework, ex. `VITE_` no Vite.)

---

## 2. Instalar e inicializar o client

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

Não precisa de autenticação de usuário — o site nunca faz login. Todo acesso é como
visitante anônimo (`anon`), e o banco decide o que ele pode ver/escrever via RLS (seção
5 abaixo).

---

## 3. Buscar o cardápio

Só produtos com `disponivel = true` aparecem pro anônimo (é a RLS que garante isso, não
precisa filtrar por segurança — mas filtre mesmo assim, é a regra de negócio: só isso
deve aparecer no cardápio).

```ts
const { data: produtos, error } = await supabase
  .from("produtos")
  .select("id, nome, numero_receita, descricao, preco, capitulo, foto_url")
  .eq("disponivel", true)
  .order("capitulo", { ascending: true })
  .order("nome", { ascending: true });
```

Campos disponíveis em `produtos`:

| Campo             | Tipo      | Observação                                  |
| ------------------ | --------- | -------------------------------------------- |
| `id`               | uuid      | usar como `produto_id` ao criar o pedido      |
| `nome`              | text      |                                                |
| `numero_receita`   | int?      | o "nº 07" do sistema de marca                 |
| `descricao`         | text?     | ingredientes/voz da marca                     |
| `preco`             | numeric   | preço de venda atual                          |
| `capitulo`          | text?     | "os clássicos", "os atrevidos", etc.          |
| `foto_url`          | text?     | URL pública do Supabase Storage (bucket `seucookie`) |

Não peça `receita_id` nem nada do módulo de insumos — o site não tem acesso a isso (é
custo interno, bloqueado por RLS pra usuário anônimo).

---

## 4. Criar um pedido

O fluxo é: **achar ou criar o cliente pelo telefone → criar o pedido → criar os itens**.
Três inserts em sequência (sem transação client-side — se um passo falhar, ver seção 6).

### 4.1 Achar ou criar cliente

O telefone é a chave natural. Tenta achar primeiro; se não existir, cria.

> **Atualizado:** `clientes` não tem mais `select` liberado pro anônimo (select livre
> vazaria nome/telefone/endereço de todo mundo pra quem abrisse o DevTools). A busca
> agora é via uma function no banco (`buscar_cliente_por_telefone`) que só devolve o
> cliente com aquele telefone exato — nunca a tabela inteira. Troque `.from("clientes").select(...)` por `.rpc(...)` como abaixo.

```ts
async function encontrarOuCriarCliente(nome: string, telefone: string, endereco?: string) {
  const { data: existentes, error: buscaError } = await supabase.rpc(
    "buscar_cliente_por_telefone",
    { p_telefone: telefone }
  );

  if (buscaError) throw buscaError;
  if (existentes && existentes.length > 0) return existentes[0];

  const { data: novo, error } = await supabase
    .from("clientes")
    .insert({ nome, telefone, endereco })
    .select("id, nome, endereco")
    .single();

  if (error) throw error;
  return novo;
}
```

> Nota: o anônimo só tem permissão de **inserir** em `clientes`, não de fazer `select`
> livre — a query acima funciona porque a policy de select permite achar pelo telefone
> exato (não lista todos os clientes, só resolve o `.eq("telefone", ...)`).

### 4.2 Criar o pedido

`origem` **precisa** ser `"site"` — é isso que a RLS verifica pra deixar o anônimo
inserir. `status` sempre começa `"novo"`.

```ts
const valorTotal = itensDoCarrinho.reduce(
  (soma, item) => soma + item.preco * item.quantidade,
  0
);

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
```

### 4.3 Criar os itens do pedido

**Congele o preço aqui** (`preco_unitario` = preço do produto *no momento do pedido*).
Se o preço mudar depois no CRM, pedidos antigos não devem mudar de valor.

```ts
const { error: itensError } = await supabase.from("pedido_itens").insert(
  itensDoCarrinho.map((item) => ({
    pedido_id: pedido.id,
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    preco_unitario: item.preco, // preço no momento da compra, não o "atual"
  }))
);

if (itensError) throw itensError;
```

---

## 5. Redirecionar pro WhatsApp

Depois do pedido criado, o site redireciona pro WhatsApp com um resumo pré-preenchido
(não existe pagamento integrado ainda — combina na conversa). Número de destino: **a
definir pelo Luís**, não está nesse repositório.

```ts
const numeroWhatsApp = "55DDDNUMERO"; // Luís fornece — sem espaços, com DDI+DDD

const resumo = itensDoCarrinho
  .map((i) => `${i.quantidade}x ${i.nome}`)
  .join("\n");

const mensagem = encodeURIComponent(
  `Novo pedido!\n\n${resumo}\n\nTotal: R$ ${valorTotal.toFixed(2)}\nPedido #${pedido.id.slice(0, 8)}`
);

window.location.href = `https://wa.me/${numeroWhatsApp}?text=${mensagem}`;
```

---

## 6. O que pode dar errado

- **Insert falha com "new row violates row-level security policy"**: confere se
  `origem: "site"` está exatamente assim (string, minúsculo) no insert de `pedidos`, e
  se você não está tentando escrever em nenhuma tabela fora de `clientes`, `pedidos`,
  `pedido_itens`. Todo o resto (insumos, receitas, notas fiscais, produção) é bloqueado
  pra anônimo de propósito.
- **`select` em `produtos` não retorna nada**: confere se o produto tem
  `disponivel = true` no CRM — é a única condição que libera leitura pro anônimo.
- **Pedido criado mas sem itens** (falhou no passo 4.3 depois do 4.2 ter funcionado):
  não há rollback automático — o pedido fica "órfão" sem itens. Trate esse erro
  explicitamente no frontend (mostra erro pro usuário, não redireciona pro WhatsApp) e,
  se acontecer com frequência, pode virar um pedido de zerar no CRM manualmente.
- **Nunca** exponha a `service_role key` no frontend do site — ela ignora todo RLS.
  Se algum dia o site precisar de uma operação privilegiada (ex. processar pagamento),
  isso deve rodar num backend/edge function, nunca no browser.

---

## 7. Referência rápida dos tipos (TypeScript)

```ts
type Produto = {
  id: string;
  nome: string;
  numero_receita: number | null;
  descricao: string | null;
  preco: number;
  capitulo: string | null;
  foto_url: string | null;
};

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string | null;
};

type PedidoOrigem = "site" | "manual";
type PedidoStatus =
  | "novo"
  | "em_producao"
  | "pronto"
  | "saiu_entrega"
  | "entregue"
  | "cancelado";
```
