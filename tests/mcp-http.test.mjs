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
  const requests = [];
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
    requests.push({ url: req.url, method: req.method, user: claims.sub, body: body ? JSON.parse(body) : null });
    res.setHeader('content-type', 'application/json');
    if (req.url.startsWith('/auth/v1/user')) { res.end(JSON.stringify({ id: claims.sub, role: 'authenticated', aud: 'authenticated' })); return; }
    if (req.url.startsWith('/rest/v1/produtos') && req.method === 'GET') {
      res.end(JSON.stringify({ id: produtoId, nome: 'Cookie', tipo_produto: 'cookie', receita_id: receitaId, qtd_estoque: 17, preco: 10, canal: 'varejo', disponivel: true })); return;
    }
    if (req.url.startsWith('/rest/v1/rpc/registrar_producao')) { res.end(JSON.stringify(randomUUID())); return; }
    if (req.url.startsWith('/rest/v1/insumos') && req.method === 'POST') { res.end(JSON.stringify({ id: randomUUID() })); return; }
    if (req.method === 'DELETE' || req.method === 'PATCH') { res.statusCode = 204; res.end(); return; }
    res.setHeader('content-range', '0-0/1');
    res.end(JSON.stringify([{ id: randomUUID(), nome: claims.sub }]));
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
    res = await fetch(url, { method: 'POST', headers: headers(), body: 'x'.repeat(256001) }); assert.equal(res.status,413);
    const connect = async (jwt) => {
      const client = new Client({ name: 'mcp-test', version: '1.0.0' });
      await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${jwt}` } } }));
      clients.push(client); return client;
    };
    const a = await connect(token()), b = await connect(token({ sub: userB }));
    const { tools } = await a.listTools(); assert.equal(tools.length,12);
    assert.ok(tools.find((t) => t.name === 'consultar').annotations.readOnlyHint);
    const [ra, rb] = await Promise.all([a.callTool({ name: 'consultar', arguments: { entidade: 'insumos' } }), b.callTool({ name: 'consultar', arguments: { entidade: 'insumos' } })]);
    assert.equal(JSON.parse(ra.content[0].text).registros[0].nome,userA);
    assert.equal(JSON.parse(rb.content[0].text).registros[0].nome,userB);
    const writesBefore = requests.filter((r) => r.method === 'POST').length;
    for (const call of [
      { name: 'cadastrar_insumo', arguments: { nome: 'Farinha', unidade_base: 'kg' } },
      { name: 'registrar_producao', arguments: { receitaId, produtoId, quantidade: -1 } },
      { name: 'cadastrar_pedido', arguments: { clienteNome: 'Teste', clienteTelefone: '', itens: [{ produto_id: produtoId, quantidade: 1, preco_unitario: 10 }] } },
      { name: 'cadastrar_produto', arguments: { nome: 'Cookie', preco: 10, qtd_estoque: 100 } },
    ]) assert.equal((await a.callTool(call)).isError, true);
    assert.equal(requests.filter((r) => r.method === 'POST').length, writesBefore);
    assert.ok(!(await a.callTool({ name: 'cadastrar_insumo', arguments: { nome: 'Farinha', unidade_base: 'g' } })).isError);
    assert.ok(!(await a.callTool({ name: 'registrar_producao', arguments: { receitaId, produtoId, quantidade: 20 } })).isError);
    assert.equal(requests.find((r) => r.url.includes('/rpc/registrar_producao')).body.p_quantidade,20);
    assert.ok(!(await a.callTool({ name: 'atualizar_produto', arguments: { id: produtoId, nome: 'Cookie novo' } })).isError);
    const productUpdate = requests.find((r) => r.method === 'PATCH' && r.url.startsWith('/rest/v1/produtos'));
    assert.equal(productUpdate.body.nome, 'Cookie novo'); assert.ok(!('qtd_estoque' in productUpdate.body));
  } catch (error) { error.message += `\nNext logs:\n${logs}`; throw error; }
  finally {
    await Promise.all(clients.map((c) => c.close()));
    app.kill('SIGTERM'); await once(app, 'exit');
    await new Promise((resolve) => mock.close(resolve));
  }
});
