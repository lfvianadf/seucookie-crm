# Seu Cookie no Dot por MCP

O código expõe `https://admin.sigaseucookie.com.br/api/mcp` por Streamable HTTP. É necessário publicar esta versão e configurar OAuth antes de conectar o plugin. Sem a configuração, a rota retorna 503 e não permite operações.

O MCP chama as mesmas actions do CRM, com um cliente Supabase isolado por requisição e autenticado como o usuário do token. Não usa `service_role`, não aceita SQL e não inclui senhas ou tokens no pacote. Além de validar assinatura, expiração, emissor e audience do Supabase, o servidor exige o client ID OAuth dedicado e um usuário da lista autorizada. As políticas RLS continuam valendo.

## Ferramentas disponíveis

O servidor oferece 50 ferramentas e reutiliza as ações e os cálculos das telas do CRM.

| Área | Operações |
| --- | --- |
| Dashboard | Indicadores e registros recentes |
| Produtos | Criar, editar, excluir, foto, disponibilidade, estoque inicial e cardápio de cookies das boxes |
| Insumos e compras | Criar, editar e excluir insumos; registrar, corrigir e excluir lotes, com recálculo de estoque/custo |
| Receitas | Criar, editar, duplicar, excluir; consultar custo, gargalo e capacidade de produção |
| Produções | Registrar, corrigir e estornar fornadas com os movimentos FIFO do banco |
| Pedidos e encomendas | Criar, editar itens/observações/data, excluir e alternar entre os seis estados; registrar e desfazer acertos e destinar sobras |
| Clientes | Criar, editar, excluir quando não houver histórico e consultar pedidos vinculados |
| Fidelidade | Consultar saldo, gerar cartão PNG e preparar texto/link de WhatsApp, registrar/desfazer cortesia; não envia mensagens |
| Financeiro | Resumo por mês ou intervalo, custos únicos/recorrentes/parcelados, encerramento de recorrência, perdas e estornos |
| Metas | Criar, editar e excluir objetivos/resultados-chave, atualizar progresso manual e consultar indicadores automáticos |
| Notas fiscais | Enviar foto para leitura, consultar/reprocessar, validar itens como compras, excluir itens pendentes e acessar foto por link privado de 5 minutos |

`consultar` lista registros e detalhes de 20 entidades, com UUID, busca, datas, vínculos, tipo de venda, status e paginação. Os resumos `consultar_financeiro`, `consultar_okrs`, `consultar_dashboard` e `consultar_custo_receita` preservam os cálculos atuais do sistema. Não implementam uma nova regra de precificação ou de custo histórico.

Ingredientes e estoque de insumos usam **g/ml/un**. Compras usam **kg/L/un**, com o **valor total pago em reais**. Produção informa número de cookies, não número de receitas. Datas exigem ISO 8601 com fuso. Fotos aceitam JPEG, PNG, WebP ou GIF em base64 puro, até **2 MB**; o conteúdo e o tamanho são validados e não há download de URLs externas.

As ferramentas resolvem cadastros por UUID; consulte nomes antes de gravar. Edições parciais preservam campos omitidos; receitas, itens de pedidos e resultados-chave exigem a lista completa. A edição de pedidos preserva composições de boxes existentes, seguindo a interface. Cancelar altera o status e não estorna estoque automaticamente. Desfaça o acerto antes de excluir uma encomenda acertada. As exclusões continuam sujeitas aos vínculos e validações do banco.

A aba **Entregas** ainda não possui operações implementadas na interface; o MCP permite apenas consultar sua tabela. Rotinas agendadas ficam a cargo do usuário/cliente MCP.

## Ativação em produção

1. No Supabase, aplique `supabase/migrations/20261105221328_crm_mcp_atomic_writes.sql` **antes de publicar o app**. A migração acrescenta funções sem apagar registros. A nova interface também passa a usar essas funções para receitas e criação de pedidos. Se faltar estoque, o pedido é recusado e a transação é desfeita.
2. Em **Authentication → OAuth Server**, habilite OAuth. Configure a Site URL como `https://admin.sigaseucookie.com.br` e o Authorization Path como `/oauth/consent`. A tela de consentimento está incluída no código.
3. Cadastre um cliente OAuth **público**, com PKCE e método de autenticação do token `none`, dedicado ao plugin Seu Cookie. Não reutilize esse cliente para outros aplicativos. Registre exatamente o callback informado pela tela de configuração MCP do ChatGPT/Dot; não use um callback presumido ou curingas. Não é necessário habilitar registro dinâmico de clientes.
4. Na Vercel, configure as variáveis de servidor:

   ```dotenv
   MCP_PUBLIC_URL=https://admin.sigaseucookie.com.br
   MCP_OAUTH_CLIENT_ID=UUID_DO_CLIENTE_OAUTH
   MCP_ALLOWED_USER_IDS=UUID_DA_SUA_CONTA
   ```

   Os UUIDs autorizados vêm de **Authentication → Users**, separados por vírgula. Use somente as contas administrativas do CRM. O client ID é público; não coloque client secret, senha ou chave administrativa nessas variáveis. Mantenha as variáveis Supabase existentes. Opcionalmente, `MCP_ALLOWED_ORIGINS` aceita origens HTTPS exatas, separadas por vírgula, se o cliente enviar o header Origin. Clientes sem esse header usam normalmente a autenticação Bearer.
5. Publique a aplicação. Confirme que `/.well-known/oauth-protected-resource` retorna os metadados e que `/api/mcp` sem token retorna **401**, com `WWW-Authenticate`, sem redirecionar para `/login`.
6. Gere o ZIP privado usando o client ID real:

   ```sh
   npm run package:mcp -- UUID_DO_CLIENTE_OAUTH
   ```

   O comando escreve um ZIP temporário e informa seu caminho. O pacote contém manifestos e uma skill de uso, sem credenciais. Importe-o como plugin privado ou use a conexão MCP da interface do Dot, com autenticação OAuth e o mesmo client ID fornecido. Caso a configuração forneça o callback somente depois de iniciar a conexão, copie-o para o cadastro OAuth e repita a conexão.
7. No Dot, faça login no CRM e aprove a tela de consentimento. Comece com `consultar` para confirmar a conexão antes de cadastrar dados reais. Gerar/importar o pacote não substitui publicar o servidor nem concluir o login.

Para bloquear imediatamente o MCP, remova os UUIDs autorizados e publique as variáveis atualizadas. Desconecte também o plugin e revogue a autorização OAuth no Supabase quando necessário.

## Validação local

```sh
npm run lint
npx tsc --noEmit
npm run build
npm run test:mcp
```

Nesta implementação, o build também foi validado com `npm run build -- --webpack`: o Turbopack foi impedido pelo ambiente de abrir sua porta interna de compilação. O Next.js e o eslint-config-next foram atualizados de 16.2.10 para 16.4.5 para corrigir alertas de segurança. A auditoria final com `npm audit --omit=dev` não apontou vulnerabilidades de produção; ainda há alertas em ferramentas de desenvolvimento fora do escopo desta integração.

Os testes de imagens validam tamanho, formato, base64 e nomes. O teste HTTP inicia o Next em uma porta livre e simula o Supabase localmente: autenticação inválida/expirada, usuário e client ID não autorizados, origem inválida, limite de corpo, descoberta pelo SDK oficial, duas contas em paralelo, validação de entradas, produção, edição sem sobrescrever estoque, seis estados, lotes, financeiro, metas, cartão PNG, leitura/validação de notas e recusas de exclusão. Nenhum dado real é consultado ou alterado.

Para testar as transações em um PostgreSQL temporário sem acrescentar dependências ao app:

```sh
npm install --prefix /tmp/seucookie-mcp-check --no-package-lock --no-audit --no-fund @electric-sql/pglite
PGLITE_MODULE=/tmp/seucookie-mcp-check/node_modules/@electric-sql/pglite/dist/index.js node --test tests/mcp-postgres.test.mjs
```

Esse teste carrega o schema e as migrações relevantes, verificando rollback de receitas, pedidos, composição de boxes, falta de estoque e bloqueio de chamadas anônimas. Não substitui testar OAuth no Supabase hospedado nem o plugin conectado ao Dot. O teste não simula concorrência real de transações em PostgreSQL.

Algumas ações herdadas da interface fazem mais de uma gravação, sem transação global. Não paralelize alterações no mesmo registro. Não há idempotência persistente para repetição de chamadas. Depois de um timeout, consulte os registros antes de repetir uma gravação. O servidor não repete gravações automaticamente.

## Referências

- [MCP e plugins no ChatGPT](https://learn.chatgpt.com/docs/extend/mcp)
- [Autenticação de plugins OpenAI](https://developers.openai.com/plugins/build/auth)
- [OAuth e MCP no Supabase](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Configuração do OAuth Server e consentimento](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
