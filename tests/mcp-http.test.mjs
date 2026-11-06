import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Supabase simulado: nenhum teste lê ou altera o banco real.
test('MCP: autenticação, isolamento, protocolo, consultas e validação de gravações', { timeout: 90_000 }, async () => {
  const userA = randomUUID(), userB = randomUUID(), clientId = randomUUID(), produtoId = randomUUID(), receitaId = randomUUID();
  const insumoId = randomUUID(), pedidoId = randomUUID(), itemId = randomUUID(), clienteId = randomUUID(), notaId = randomUUID(), notaItemId = randomUUID(), okrId = randomUUID(), resultadoId = randomUUID(), loteId = randomUUID();
  const requests = [];
  let failTable = '', itemValidado = false, automatico = false, pedidoAcertado = false;
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ZkAAAAASUVORK5CYII=';
  const secret = 'segredo-exclusivo-dos-testes';
  const base64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const sign = (s) => createHmac('sha256', secret).update(s).digest('base64url');
  const mock = createServer(async (req, res) => {
    const raw = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const [header, payload, signature] = raw.split('.');
    if (!signature || sign(`${header}.${payload}`) !== signature) {
      res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: 'Invalid token' })); return;
    }
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    let body = ''; for await (const chunk of req) body += chunk;
    const bodyJson = body && req.headers['content-type']?.includes('application/json') ? JSON.parse(body) : null;
    requests.push({ url: req.url, method: req.method, user: claims.sub, body: bodyJson });
    res.setHeader('content-type', 'application/json');
    if (req.url.startsWith('/auth/v1/user')) { res.end(JSON.stringify({ id: claims.sub, role: 'authenticated', aud: 'authenticated' })); return; }
    if (req.url.startsWith('/storage/v1/object/sign/')) { res.end(JSON.stringify({ signedURL: '/object/sign/notas-fiscais/nota.png?token=teste' })); return; }
    if (req.url.startsWith('/storage/') || req.url.startsWith('/functions/')) { res.end(JSON.stringify({ Key: 'nota.png' })); return; }
    const url = new URL(req.url, 'http://localhost');
    const table = url.pathname.split('/').pop();
    if (failTable === table) { res.statusCode = 400; res.end(JSON.stringify({ message: 'Operação recusada pelo banco', code: '23503' })); return; }
    if (url.pathname.includes('/rpc/')) { res.end(JSON.stringify(randomUUID())); return; }
    const fixtures = {
      produtos: [{ id: produtoId, nome: 'Cookie', tipo_produto: 'cookie', receita_id: receitaId, qtd_estoque: 17, preco: 10.9, canal: 'varejo', disponivel: true, produto_box_itens: [] }],
      insumos: [{ id: insumoId, nome: claims.sub, unidade_base: 'g', categoria: 'secos', custo_medio_por_unidade: 40, estoque_atual: 1000 }],
      receitas: [{ id: receitaId, nome: 'Massa', rendimento_cookies: 10 }],
      receita_insumos: [{ receita_id: receitaId, insumo_id: insumoId, quantidade: 1000 }],
      producoes: [{ id: randomUUID(), quantidade_produzida: 20, data: '2026-11-01T12:00:00Z' }],
      pedidos: [{ id: pedidoId, status: 'novo', tipo_venda: 'varejo', valor_total: 10.9, valor_liquido_recebido: null, observacoes: 'Preservar', encomenda_acertos: pedidoAcertado ? { id: randomUUID() } : null,
        pedido_itens: [{ id: itemId, produto_id: produtoId, quantidade: 1, preco_unitario: 10.9, produtos: { tipo_produto: 'cookie' } }] }],
      pedido_itens: [{ id: itemId, produto_id: produtoId, quantidade: 1, preco_unitario: 10.9 }],
      clientes: [{ id: clienteId, nome: 'Pedro', telefone: '85999999999', endereco: 'Rua teste' }],
      insumo_lotes: [{ id: loteId, insumo_id: insumoId, quantidade: 1000, preco_unitario: 0.04, data: '2026-10-10T12:00:00Z' }],
      perdas: [], encomenda_acertos: [], encomenda_acerto_itens: [],
      custos_mensais: [{ id: randomUUID(), descricao: 'Aluguel', valor: 80, competencia: '2026-11-01', tipo: 'recorrente', parcelas: null, encerrado_em: null }],
      okrs: [{ id: okrId, objetivo: 'Crescer', okr_resultados: [{ id: resultadoId, descricao: 'Venda', metrica: 'vendas', alvo: 109, progresso_manual: 0 }] }],
      okr_resultados: [{ id: resultadoId, okr_id: okrId, metrica: automatico ? 'vendas' : 'manual', progresso_manual: 0 }],
      notas_fiscais: [{ id: notaId, foto_url: 'nota.png', data_compra: '2026-10-10' }],
      nota_itens: [{ id: notaItemId, nota_id: notaId, texto_original: 'FARINHA', quantidade: 1000, valor: 40, validado: itemValidado }],
      fidelidade_clientes: [{ cliente_id: clienteId, nome: 'Pedro', telefone: '85999999999', cookies_no_cartao: 12 }],
    };
    let rows = fixtures[table] ?? [];
    if (url.searchParams.get('tipo_venda') === 'eq.encomenda') rows = [];
    if (url.searchParams.get('validado') === 'eq.true') rows = rows.filter((r) => r.validado);
    if (url.searchParams.has('telefone') || url.searchParams.has('or')) rows = [];
    if (req.method === 'POST') rows = [{ id: randomUUID(), ...bodyJson }];
    if (req.method === 'PATCH') rows = rows.map((r) => ({ ...r, ...bodyJson }));
    if (req.method === 'DELETE' || (req.method === 'PATCH' && !url.searchParams.has('select'))) { res.statusCode = 204; res.end(); return; }
    res.setHeader('content-range', `0-${Math.max(rows.length-1, 0)}/${rows.length}`);
    if (req.method === 'HEAD') { res.end(); return; }
    res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] : rows));
  }).listen(0, '127.0.0.1');
  await once(mock, 'listening');
  const supabaseUrl = `http://127.0.0.1:${mock.address().port}`;
  // Porta livre para o processo Next, evitando conflito com o CRM em uso.
  const portProbe = createServer().listen(0, '127.0.0.1'); await once(portProbe, 'listening');
  const port = portProbe.address().port; await new Promise((resolve) => portProbe.close(resolve));
  const origin = `http://localhost:${port}`;
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key', MCP_PUBLIC_URL: origin, MCP_OAUTH_CLIENT_ID: clientId, MCP_ALLOWED_USER_IDS: `${userA},${userB}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = ''; app.stdout.on('data', (s) => { logs = (logs + s).slice(-10000); }); app.stderr.on('data', (s) => { logs = (logs + s).slice(-10000); });
  const token = (overrides = {}) => {
    const data = `${base64({ alg: 'HS256', typ: 'JWT' })}.${base64({ sub: userA, iss: `${supabaseUrl}/auth/v1`, aud: 'authenticated', role: 'authenticated', client_id: clientId, exp: Math.floor(Date.now()/1000)+3600, ...overrides })}`;
    return `${data}.${sign(data)}`;
  };
  const url = new URL('/api/mcp', origin);
  const headers = (value = token()) => ({ Authorization: `Bearer ${value}`, Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' });
  const clients = [];
  try {
    let ready = false;
    for (let i=0; i<150; i++) {
      try { const res = await fetch(new URL('/.well-known/oauth-protected-resource', origin)); if (res.ok) { ready = true; break; } } catch {}
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(ready, logs);
    let res = await fetch(url, { method: 'POST', body: '{}' }); assert.equal(res.status, 401); assert.ok(res.headers.get('www-authenticate'));
    for (const bad of ['invalid', 'e30.e30.eA', token({ exp: 1 }), token({ sub: randomUUID() }), token({ client_id: randomUUID() }), token({ iss: 'https://evil.test' })]) {
      res = await fetch(url, { method: 'POST', headers: headers(bad), body: '{}' }); assert.ok([401,403].includes(res.status), `${bad}: ${res.status}`);
    }
    res = await fetch(url, { method: 'POST', headers: { ...headers(), Origin: 'https://evil.test' }, body: '{}' }); assert.equal(res.status,403);
    res = await fetch(url, { method: 'POST', headers: headers(), body: 'x'.repeat(3_000_001) }); assert.equal(res.status,413);
    const connect = async (jwt) => {
      const client = new Client({ name: 'mcp-test', version: '1.0.0' });
      await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${jwt}` } } }));
      clients.push(client); return client;
    };
    const a = await connect(token()), b = await connect(token({ sub: userB }));
    const { tools } = await a.listTools(); assert.equal(tools.length,50);
    for (const t of tools) assert.equal(t.annotations.destructiveHint, !t.annotations.readOnlyHint, t.name);
    assert.ok(tools.find((t) => t.name === 'consultar').annotations.readOnlyHint);
    const [ra, rb] = await Promise.all([a.callTool({ name: 'consultar', arguments: { entidade: 'insumos' } }), b.callTool({ name: 'consultar', arguments: { entidade: 'insumos' } })]);
    assert.equal(JSON.parse(ra.content[0].text).registros[0].nome,userA);
    assert.equal(JSON.parse(rb.content[0].text).registros[0].nome,userB);
    const writesBefore = requests.filter((r) => r.method === 'POST').length;
    for (const call of [
      { name: 'cadastrar_insumo', arguments: { nome: 'Farinha', unidade_base: 'kg' } },
      { name: 'registrar_producao', arguments: { receitaId, produtoId, quantidade: -1 } },
      { name: 'cadastrar_pedido', arguments: { clienteNome: 'Teste', clienteTelefone: '', itens: [{ produto_id: produtoId, quantidade: 1, preco_unitario: 10 }] } },
      { name: 'cadastrar_produto', arguments: { nome: 'Cookie', preco: 10, qtd_estoque: -1 } },
    ]) assert.equal((await a.callTool(call)).isError, true);
    assert.equal(requests.filter((r) => r.method === 'POST').length, writesBefore);
    assert.ok(!(await a.callTool({ name: 'cadastrar_insumo', arguments: { nome: 'Farinha', unidade_base: 'g' } })).isError);
    assert.ok(!(await a.callTool({ name: 'registrar_producao', arguments: { receitaId, produtoId, quantidade: 20 } })).isError);
    assert.equal(requests.find((r) => r.url.includes('/rpc/registrar_producao')).body.p_quantidade,20);
    assert.ok(!(await a.callTool({ name: 'atualizar_produto', arguments: { id: produtoId, nome: 'Cookie novo' } })).isError);
    const productUpdate = requests.find((r) => r.method === 'PATCH' && r.url.startsWith('/rest/v1/produtos'));
    assert.equal(productUpdate.body.nome, 'Cookie novo'); assert.ok(!('qtd_estoque' in productUpdate.body));
    const call = async (name, args = {}) => {
      const result = await a.callTool({ name, arguments: args });
      assert.ok(!result.isError, `${name}: ${JSON.stringify(result.content)}`);
      return result.content[0].type === 'text' ? JSON.parse(result.content[0].text) : result.content[0];
    };
    const reject = async (name, args) => assert.equal((await a.callTool({ name, arguments: args })).isError, true, name);
    for (const estado of ['novo', 'em_producao', 'pronto', 'saiu_entrega', 'entregue', 'cancelado']) await call('atualizar_status_pedido', { id: pedidoId, status: estado });
    assert.deepEqual(requests.filter((r) => r.method === 'PATCH' && r.body?.status).map((r) => r.body.status), ['novo', 'em_producao', 'pronto', 'saiu_entrega', 'entregue', 'cancelado']);
    await call('atualizar_cliente', { id: clienteId, endereco: 'Novo endereço' });
    assert.equal(requests.find((r) => r.method === 'PATCH' && r.url.includes('/clientes')).body.telefone, '85999999999');
    await call('editar_lote_insumo', { loteId, quantidade: 2, valorPago: 80 });
    assert.equal(requests.find((r) => r.url.includes('/rpc/editar_lote_insumo')).body.p_data, '2026-10-10T12:00:00Z');
    await call('atualizar_pedido', { pedidoId, itens: [{ id: itemId, produto_id: produtoId, quantidade: 2, preco_unitario: 10.9 }] });
    assert.equal(requests.find((r) => r.method === 'PATCH' && r.body?.valor_total).body.valor_total, 21.8);
    await reject('atualizar_pedido', { pedidoId, itens: [{ id: randomUUID(), produto_id: produtoId, quantidade: 1, preco_unitario: 10.9 }] });
    await reject('cadastrar_produto', { nome: 'Box', preco: 30, tipo_produto: 'box', box_cookies: [produtoId, produtoId] });
    await reject('atualizar_insumo', { id: insumoId, unidade_base: 'un' });
    await call('cadastrar_custo_mensal', { descricao: 'Energia', valor: 80, mes: '2026-11', tipo: 'recorrente' });
    assert.equal(requests.find((r) => r.method === 'POST' && r.url.includes('/custos_mensais')).body.competencia, '2026-11-01');
    await reject('cadastrar_custo_mensal', { descricao: 'Forno', valor: 100, mes: '2026-11', tipo: 'parcelado' });
    await call('atualizar_progresso_okr', { resultadoId, progresso: 4 });
    automatico = true;
    await reject('atualizar_progresso_okr', { resultadoId, progresso: 4 });
    await reject('atualizar_okr', { id: okrId, objetivo: 'Teste', resultados: [{ id: randomUUID(), descricao: 'Inválido', metrica: 'manual', alvo: 10 }] });
    const financeiro = await call('consultar_financeiro', { mes: '2026-11' });
    assert.equal(financeiro.vendas, 10.9); assert.equal(financeiro.custoDosVendidos, 4); assert.equal(financeiro.custosFixos, 80);
    assert.ok(Math.abs(financeiro.lucro - (10.9 - 4 - 80)) < 0.000001);
    assert.equal((await call('consultar_okrs', { mes: '2026-11' })).objetivos[0].okr_resultados[0].atual, 10.9);
    assert.equal((await call('consultar_custo_receita', { receitaId })).custoPorCookie, 4);
    assert.equal((await call('consultar_dashboard', { mes: '2026-11' })).cookiesProduzidos, 20);
    failTable = 'insumos'; await reject('consultar_financeiro', { mes: '2026-11' }); failTable = '';
    const imagem = await call('gerar_cartao_fidelidade', { clienteId });
    assert.equal(imagem.type, 'image'); assert.equal(imagem.mimeType, 'image/png');
    assert.equal(Buffer.from(imagem.data, 'base64').readUInt32BE(0), 0x89504e47);
    assert.equal((await call('preparar_fidelidade', { clienteId })).fidelidade.cortesias, 1);
    await call('cadastrar_nota_fiscal', { foto: { nome: 'nota.png', tipo: 'image/png', base64: png }, data_compra: '2026-10-10' });
    assert.ok(requests.some((r) => r.url.startsWith('/functions/v1/parse-nota-fiscal')));
    await call('validar_item_nota', { itemId: notaItemId, insumoId, quantidade: 1000, valor: 40 });
    const entrada = requests.find((r) => r.url.includes('/rpc/registrar_entrada_insumo'));
    assert.equal(entrada.body.p_quantidade, 1); assert.equal(entrada.body.p_data, '2026-10-10T12:00:00-03:00');
    itemValidado = true;
    const entradasAntes = requests.filter((r) => r.url.includes('/rpc/registrar_entrada_insumo')).length;
    await reject('validar_item_nota', { itemId: notaItemId, insumoId, quantidade: 1000, valor: 40 });
    await reject('reprocessar_nota_fiscal', { notaId }); await reject('excluir_item_nota', { itemId: notaItemId });
    assert.equal(requests.filter((r) => r.url.includes('/rpc/registrar_entrada_insumo')).length, entradasAntes);
    failTable = 'produtos'; await reject('excluir_produto', { id: produtoId }); failTable = '';
    pedidoAcertado = true; await reject('excluir_pedido', { id: pedidoId });
    assert.ok(!requests.some((r) => r.method === 'DELETE' && r.url.startsWith('/rest/v1/pedidos')));
    await call('excluir_producao', { id: produtoId });
    assert.equal(requests.find((r) => r.url.includes('/rpc/estornar_producao')).body.p_producao_id, produtoId);
    await call('consultar', { entidade: 'pedidos', tipoVenda: 'encomenda', filtro: { campo: 'cliente_id', id: clienteId } });
    assert.ok(requests.some((r) => r.url.includes('tipo_venda=eq.encomenda') && r.url.includes(`cliente_id=eq.${clienteId}`)));
    await reject('consultar', { entidade: 'produtos', filtro: { campo: 'cliente_id', id: clienteId } });
  } catch (error) { error.message += `\nNext logs:\n${logs}`; throw error; }
  finally {
    await Promise.all(clients.map((c) => c.close()));
    app.kill('SIGTERM'); await once(app, 'exit');
    await new Promise((resolve) => mock.close(resolve));
  }
});
