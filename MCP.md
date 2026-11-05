# Seu Cookie no Dot por MCP

O código expõe `https://admin.sigaseucookie.com.br/api/mcp` por Streamable HTTP. É necessário publicar esta versão e configurar OAuth antes de conectar o plugin. Sem a configuração, a rota retorna 503 e não permite operações.

O MCP chama as mesmas actions do CRM, com um cliente Supabase isolado por requisição e autenticado como o usuário do token. Não usa `service_role`, não aceita SQL e não inclui senhas ou tokens no pacote. Além de validar assinatura, expiração, emissor e audience do Supabase, o servidor exige o client ID OAuth dedicado e um usuário da lista autorizada. As políticas RLS continuam valendo.

## Ferramentas disponíveis

| Ferramenta | Operação |
| --- | --- |
| `consultar` | Produtos, estoque, insumos, receitas e ingredientes, produção, pedidos e itens, clientes e lotes; filtros e paginação |
| `cadastrar_produto` / `atualizar_produto` | Cookies, preços, descrição e vínculo com receita; edição preserva estoque |
| `cadastrar_insumo` / `atualizar_insumo` | Identidade do insumo; estoque e custo vêm dos lotes |
| `cadastrar_receita` / `atualizar_receita` | Fórmula completa e rendimento, em uma transação |
| `registrar_compra_insumo` | Entrada de compra, lote e recálculo de custo |
| `registrar_producao` / `atualizar_producao` | Produção com consumo FIFO dos insumos e atualização dos cookies |
| `cadastrar_pedido` | Pedido ou encomenda, com cookies ou boxes e baixa de estoque, em uma transação |
| `atualizar_status_pedido` | Etapa do pedido ou encomenda |

Ingredientes e estoque de insumos usam **g/ml/un**. Compras usam **kg/L/un**, com o **valor total pago em reais**. Produção informa número de cookies, não número de receitas. Datas exigem ISO 8601 com fuso.

As ferramentas resolvem cadastros por UUID; o Dot deve consultar os nomes antes de gravar. Não há exclusões, upload de fotos, cadastro/edição de boxes, edição de itens de pedidos, financeiro ou notas fiscais no MCP. Essas operações continuam disponíveis pela interface. Cancelar um pedido altera o status, seguindo o comportamento atual do CRM; não estorna estoque automaticamente.

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

O teste HTTP inicia o Next em uma porta livre e simula o Supabase localmente: autenticação inválida/expirada, usuário e client ID não autorizados, origem inválida, limite de corpo, descoberta pelo SDK oficial, duas contas em paralelo, validação de entradas, produção e edição sem sobrescrever estoque. Nenhum dado real é consultado ou alterado.

Para testar as transações em um PostgreSQL temporário sem acrescentar dependências ao app:

```sh
npm install --prefix /tmp/seucookie-mcp-check --no-package-lock --no-audit --no-fund @electric-sql/pglite
PGLITE_MODULE=/tmp/seucookie-mcp-check/node_modules/@electric-sql/pglite/dist/index.js node --test tests/mcp-postgres.test.mjs
```

Esse teste carrega o schema e as migrações relevantes, verificando rollback de receitas, pedidos, composição de boxes, falta de estoque e bloqueio de chamadas anônimas. Não substitui testar OAuth no Supabase hospedado nem o plugin conectado ao Dot. O teste não simula concorrência real de transações em PostgreSQL.

Não há idempotência persistente para repetição de chamadas. Depois de um timeout, consulte os registros antes de repetir uma gravação. O servidor não repete gravações automaticamente.

## Referências

- [MCP e plugins no ChatGPT](https://learn.chatgpt.com/docs/extend/mcp)
- [Autenticação de plugins OpenAI](https://developers.openai.com/plugins/build/auth)
- [OAuth e MCP no Supabase](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Configuração do OAuth Server e consentimento](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
