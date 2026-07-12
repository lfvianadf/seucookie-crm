# Seu Cookie — CRM de Gestão · Documento de Arquitetura

> Handoff para Claude Code. Define arquitetura, modelo de dados e ordem de construção.
> **Projeto separado do site.** Compartilha o mesmo banco Supabase, mas é outra aplicação.
> Usuários: apenas Luís e Clara. Stack: Next.js + Supabase (Supabase JS/API).

---

## 0. Princípios que regem este projeto

1. **Rápido de alimentar ou será abandonado.** Cadastrar um pedido não pode levar mais de ~15 segundos. Todo campo precisa justificar sua existência contra a pergunta "isso atrasa o cadastro?". Se atrasa e não é essencial, vai pra depois.
2. **IA sugere, humano valida.** Nenhum dado parseado automaticamente (nota fiscal) entra no banco sem confirmação explícita na tela. O cálculo de custo depende disso — parse errado não pode virar custo errado silenciosamente.
3. **Fonte única de verdade.** O cardápio vive no CRM. O site apenas lê. Nunca duplicar produto em dois lugares.
4. **Construir na ordem de dependência, não de empolgação.** Receitas antes de nota fiscal, nota antes de cálculo. Ver seção de fases.
5. **Pagamento é fase 2.** No dia 1 o site cria o pedido e redireciona pro WhatsApp com o resumo. Nenhuma credencial de gateway entra agora.

---

## 1. Arquitetura geral

Dois projetos, um banco:

```
┌─────────────────┐         ┌─────────────────┐
│   SITE (público)│         │  CRM (privado)  │
│   Next.js       │         │  Next.js        │
│                 │         │                 │
│  - lê cardápio  │         │  - escreve tudo │
│  - monta pedido │         │  - gestão       │
│  - cria pedido  │         │  - login Luís/  │
│    no Supabase  │         │    Clara        │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
          ┌────────────────────┐
          │  SUPABASE (Postgres)│
          │  + Auth + Storage   │
          │  + RLS              │
          └────────────────────┘
```

- **Banco compartilhado**, mas acesso controlado por RLS (Row Level Security).
- Site usa a **anon key** com policies restritas: lê `produtos` disponíveis, insere em `pedidos`. Nada além disso.
- CRM usa autenticação (Luís e Clara) e tem acesso de gestão às tabelas, também via RLS — só usuários autenticados escrevem.
- **Atenção de segurança:** as policies de RLS são o que impede o site público de ler/escrever o que não deve. Configurar RLS explicitamente em toda tabela. Nunca usar a service_role key no frontend do site.

---

## 2. Modelo de dados

Tabelas e relações. Nomes em português para casar com o domínio.

### 2.1 Núcleo do cardápio e pedidos

**`produtos`** — o cardápio, fonte única
- `id` (uuid, pk)
- `nome` (text) — ex: "Cookie de Pistache"
- `numero_receita` (int) — o "nº 07" do sistema de marca
- `descricao` (text) — ingredientes curtos, voz da marca
- `preco` (numeric) — preço de venda
- `disponivel` (bool) — controla o que o site mostra HOJE
- `capitulo` (text) — "os clássicos", "os atrevidos", "os da estação"
- `foto_url` (text) — Supabase Storage
- `receita_id` (uuid, fk → receitas) — liga ao custo/ficha técnica
- `created_at`, `updated_at`

**`clientes`**
- `id` (uuid, pk)
- `nome` (text)
- `telefone` (text) — chave natural, vem do WhatsApp
- `endereco` (text, nullable)
- `created_at`
- Índice em `telefone` (é como você reencontra o cliente e mede recompra).

**`pedidos`**
- `id` (uuid, pk)
- `cliente_id` (uuid, fk → clientes)
- `status` (enum: `novo`, `em_producao`, `pronto`, `saiu_entrega`, `entregue`, `cancelado`)
- `origem` (enum: `site`, `manual`) — pedido do site vs digitado por vocês
- `valor_total` (numeric)
- `observacoes` (text)
- `data_pedido` (timestamptz)
- `data_entrega_prevista` (timestamptz, nullable)
- `created_at`, `updated_at`

**`pedido_itens`** — os produtos dentro de um pedido
- `id` (uuid, pk)
- `pedido_id` (uuid, fk → pedidos)
- `produto_id` (uuid, fk → produtos)
- `quantidade` (int)
- `preco_unitario` (numeric) — congelado no momento do pedido (preço pode mudar depois)

### 2.2 Módulo de insumos — o coração complexo

**`insumos`** — matéria-prima
- `id` (uuid, pk)
- `nome` (text) — ex: "Farinha de trigo"
- `unidade_base` (enum: `g`, `ml`, `un`) — unidade em que a receita consome
- `estoque_atual` (numeric, na unidade_base) — quanto tem hoje
- `custo_medio_por_unidade` (numeric) — R$ por g/ml/un, atualizado pelas notas
- `created_at`, `updated_at`

**`insumo_apelidos`** — o "de-para" da nota fiscal (CRÍTICO)
- `id` (uuid, pk)
- `insumo_id` (uuid, fk → insumos)
- `texto_nota` (text) — ex: "FARINHA TRIGO TIPO1 DONA BENTA 1KG"
- Toda vez que uma nota traz um texto novo, depois de você validar a que insumo ele pertence, salva aqui. Da próxima vez o sistema já reconhece sozinho. O de-para APRENDE com o uso.

**`receitas`** — ficha técnica (FUNDAÇÃO — construir primeiro)
- `id` (uuid, pk)
- `nome` (text) — ex: "Massa base de cookie"
- `rendimento_cookies` (int) — quantos cookies essa receita rende
- `created_at`, `updated_at`

**`receita_insumos`** — o que cada receita consome
- `id` (uuid, pk)
- `receita_id` (uuid, fk → receitas)
- `insumo_id` (uuid, fk → insumos)
- `quantidade` (numeric, na unidade_base do insumo) — ex: 300 (g de farinha)
- É esta tabela que torna possível o cálculo "quantos cookies dá pra fazer" e "custo por cookie".

**`notas_fiscais`** — registro das compras
- `id` (uuid, pk)
- `foto_url` (text) — Supabase Storage
- `data_compra` (date)
- `valor_total` (numeric)
- `status` (enum: `processando`, `aguardando_validacao`, `confirmada`)
- `created_at`

**`nota_itens`** — itens parseados da nota (staging antes de virar estoque)
- `id` (uuid, pk)
- `nota_id` (uuid, fk → notas_fiscais)
- `texto_original` (text) — o que o OCR/IA leu
- `insumo_id` (uuid, fk → insumos, nullable até validação)
- `quantidade` (numeric)
- `valor` (numeric)
- `validado` (bool) — vira true só quando você confirma na tela
- Só itens validados atualizam `insumos.estoque_atual` e `custo_medio_por_unidade`.

**`producoes`** — registro de fornadas (aba produção)
- `id` (uuid, pk)
- `receita_id` (uuid, fk → receitas)
- `produto_id` (uuid, fk → produtos)
- `quantidade_produzida` (int) — cookies feitos
- `data` (timestamptz)
- Ao registrar produção, baixa o estoque dos insumos proporcionalmente (via receita_insumos). Esta é a ponte entre "comprei insumo" e "virou cookie".

### 2.3 Entregas

**`entregas`**
- `id` (uuid, pk)
- `pedido_id` (uuid, fk → pedidos)
- `endereco` (text)
- `status` (enum: `pendente`, `saiu`, `entregue`)
- `data_saida` (timestamptz, nullable)
- `data_entrega` (timestamptz, nullable)
- Versão mínima proposital: endereço + status + quando. Taxa/mapa/rota ficam pra depois.

---

## 3. O cálculo central (custo por cookie)

Este é o cérebro do módulo de insumos. Lógica:

1. Cada `receita` tem N `receita_insumos` (quantidade de cada insumo) e um `rendimento_cookies`.
2. **Custo da receita** = soma de (`quantidade` × `custo_medio_por_unidade` do insumo) para cada insumo da receita.
3. **Custo por cookie** = custo da receita ÷ `rendimento_cookies`.
4. **Quantos cookies posso fazer AGORA** = para cada insumo da receita, calcular `estoque_atual ÷ quantidade` (quantas receitas dá pra fazer com o estoque daquele insumo); o **menor** desses valores é o gargalo × rendimento = total de cookies possíveis. (O insumo que acaba primeiro limita a produção — é o conceito de "ingrediente gargalo".)

Exibir na tela: custo por cookie de cada sabor, e "com o estoque atual você consegue fazer X cookies de Y". Atualiza sozinho quando uma nota nova é confirmada (muda o custo_medio) ou quando uma produção é registrada (baixa o estoque).

**Nota de precisão:** `custo_medio_por_unidade` deve ser média ponderada — ao confirmar uma nota, recalcular considerando estoque antigo + nova compra, não só sobrescrever. Senão o custo oscila errado a cada compra.

---

## 4. Fluxo do pedido (site → CRM), fase 1 sem pagamento

1. Cliente monta o pedido no site (lê `produtos` onde `disponivel = true`).
2. Ao finalizar: site insere `cliente` (ou encontra pelo telefone), insere `pedido` com `origem = site` e `status = novo`, insere os `pedido_itens`.
3. Site redireciona pro WhatsApp (`wa.me`) com mensagem pré-preenchida: resumo do pedido + valor + número do pedido.
4. Vocês recebem no WhatsApp, combinam pagamento/entrega na conversa, e acompanham o pedido no CRM (mudando o status).

Pagamento real (gateway, Pix, webhook) entra na fase 2 — a estrutura de `pedidos` já suporta, é só adicionar depois.

---

## 5. Ordem de construção (fases)

**Fundação primeiro — na ordem de dependência:**

**Fase 0 — Setup**
Projeto Next separado, conexão Supabase, autenticação para Luís e Clara, RLS em todas as tabelas, layout base com sidebar (Cardápio, Pedidos, Insumos → Receitas/Produção, Entregas).

**Fase 1 — Cardápio + Pedidos (o que gera receita)**
- CRUD de `produtos` com toggle `disponivel`.
- Tela de pedidos: lista, criação manual, mudança de status. Cadastro RÁPIDO (princípio 1).
- Cadastro de `clientes` com busca por telefone.
- Integração de leitura com o site (site lê produtos disponíveis).
- Fluxo de pedido do site criando registro (seção 4).

**Fase 2 — Insumos: Receitas (a fundação do custo)**
- CRUD de `insumos`.
- CRUD de `receitas` + `receita_insumos` (a ficha técnica).
- Já exibir custo por cookie com custo de insumo preenchido manualmente (antes mesmo da nota fiscal funcionar).

**Fase 3 — Insumos: Nota fiscal (o parsing)**
- Upload de foto da nota (Supabase Storage).
- OCR + Anthropic API para extrair itens (texto, quantidade, valor).
- Tela de validação: sistema sugere o insumo (usando `insumo_apelidos` + IA), VOCÊ confirma cada item. Só validado atualiza estoque e custo médio.
- Salvar novos apelidos para o de-para aprender.

**Fase 4 — Insumos: Produção + cálculo de capacidade**
- Aba produção: registrar fornada, baixar estoque.
- Cálculo "quantos cookies posso fazer com o estoque atual" (seção 3).

**Fase 5 — Entregas**
- CRUD de entregas ligado a pedidos, status simples.

**Fase 6 (futuro) — Pagamento no site**
- Gateway, webhook de confirmação. **Credenciais são do Luís** — Claude Code descreve a integração mas NÃO recebe nem configura chaves de gateway.

---

## 6. Pontos onde Claude Code para e devolve a bola

- **Credenciais Supabase** (URL, keys): Luís configura no `.env`. Nunca commitar.
- **Chave da Anthropic API** (parsing de nota): Luís configura no `.env`.
- **Qualquer credencial de pagamento** (fase 6): Luís pluga com a própria conta. Claude Code não entra aqui.
- **Número do WhatsApp** de destino dos pedidos: Luís fornece.

---

## 7. Diretrizes de design (ferramenta, não vitrine)

**Princípio central: o CRM herda o esqueleto da marca, não a alma.** A identidade da Seu Cookie (papel envelhecido, epoché, fita adesiva, traço à mão) é linguagem afetiva feita para vender ao cliente. Um CRM é ferramenta de trabalho usada por Luís e Clara dezenas de vezes ao dia, muitas vezes no meio de uma fornada, cansados, no celular. Aplicar textura e ornamento aqui deixa tudo mais lento de ler e cansa. **A regra é: clareza fria sobre charme.**

### 7.1 O que herdar da marca (esqueleto)
- **Berinjela (`#43303B`)** como cor de texto principal, cabeçalhos e barra superior/sidebar. É o que impede o CRM de parecer um template genérico solto do negócio.
- **Rosa antigo (`#C86B85`)** apenas na ação principal de cada tela (botão primário: salvar, criar pedido). Um por tela, como no site.
- **Sálvia (`#7D9B76`)** para status positivo/concluído — coerente com o brand book (sálvia = pronto/disponível).

### 7.2 O que NÃO trazer da marca
- **Sem** textura de papel. Fundo é branco-neutro (`#FAFAF8` ou similar), não `--papel` texturizado.
- **Sem** epoché. Tipografia é uma sans limpa e legível (Inter, system-ui, ou Nunito Sans que já está no ecossistema). Display serifado cansa em tela densa.
- **Sem** fita adesiva, manuscrita (Caveat), carimbo, flor prensada, mancha de café, borda rasgada ou qualquer ornamento de caderno. Nada disso entra no CRM.
- **Sem** assimetria proposital. O site é assimétrico de propósito; o CRM é o oposto — alinhado, previsível, em grid comportado. Previsibilidade é velocidade quando se usa a mesma tela toda hora.

### 7.3 Cor tem função, não decoração
Num CRM, cor é sinalização — perde o poder se espalhada. O CRM é majoritariamente **neutro (cinzas + berinjela)**, e cor só aparece onde carrega significado operacional:
- **Vermelho/coral** — problema, erro, estoque crítico, pedido cancelado.
- **Sálvia/verde** — ok, concluído, disponível, entregue.
- **Âmbar** — atenção, aguardando validação, estoque baixo.
- **Rosa** — ação primária (reservado a botão de ação, não a status).

Se um status pudesse ser lido só pelo texto, não precisa de cor. Cor é para o que precisa ser visto de relance.

### 7.4 Densidade sobre respiro
- Tabelas densas, informação por perto, tudo alinhado. O luxo de espaço do site não se aplica aqui.
- Listas (pedidos, insumos) devem mostrar muitos itens sem scroll excessivo — linhas compactas, não cards espaçados.
- O que é consultado junto fica junto na tela.

### 7.5 Mobile: o fluxo de cadastro rápido é sagrado
Luís e Clara vão registrar pedido e conferir estoque no celular, no balcão, em movimento. Por isso:
- Os fluxos de **cadastro rápido** (novo pedido, registrar produção) precisam ser impecáveis no toque: botões grandes (mínimo 44px), poucos campos por tela, mínimo de digitação possível.
- Sempre que possível: seleção por toque (botão, chip, dropdown) em vez de digitação livre. Ex: escolher produto de uma lista de botões, não digitar o nome.
- Reforça o princípio nº 0.1: cadastrar um pedido em ~15 segundos. No mobile isso é ainda mais crítico.
- Tabelas densas do desktop viram listas roláveis simples no mobile — priorizar a informação que importa no balcão (o que pedir, quanto, status).

### 7.6 Resumo da direção
Marca no esqueleto, ferramenta na alma. Se ao olhar uma tela do CRM você pensar "que bonitinho", provavelmente errou. Se pensar "achei o que precisava em 2 segundos", acertou.

---

## 8. Riscos e cuidados técnicos

- **RLS é a linha de defesa.** Site público não pode ler custo de insumo, dados de outros clientes, nem escrever em produtos. Testar as policies explicitamente.
- **OCR de foto de cupom é frágil.** Cupom amassado, foto torta, item abreviado. Por isso a validação humana é obrigatória — nunca pular. Tratar o parsing como sugestão, sempre.
- **Custo médio ponderado**, não sobrescrito (seção 3).
- **Congelar `preco_unitario` no pedido_item** — se o preço do produto mudar depois, pedidos antigos mantêm o valor da época.
- **Não construir o que não vai usar.** Este doc já corta escopo de propósito (entrega mínima, pagamento adiado). Resistir a adicionar campo "que pode ser útil um dia".