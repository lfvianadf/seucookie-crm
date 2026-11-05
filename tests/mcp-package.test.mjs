import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mcpManifest } from '../scripts/package-mcp.mjs';

test('pacote usa endpoint e client ID reais, sem credenciais', () => {
  const clientId = '00000000-0000-4000-8000-000000000001';
  const manifest = mcpManifest(clientId);
  const server = manifest.mcpServers['seucookie-crm'];
  assert.equal(server.url, 'https://admin.sigaseucookie.com.br/api/mcp');
  assert.equal(server.extensions['com.openai'].auth.client.clientId, clientId);
  for (const value of [undefined, '', 'client-secret']) assert.throws(() => mcpManifest(value));
  for (const url of ['http://example.com', 'https://user:secret@example.com', 'https://example.com/other', 'https://example.com?secret=1']) assert.throws(() => mcpManifest(clientId, url));
  assert.ok(!JSON.stringify(manifest).includes('clientSecret'));
});
