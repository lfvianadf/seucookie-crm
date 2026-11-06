import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arquivoParaFile, MAX_ARQUIVO_BYTES } from '../src/lib/mcp/arquivos.ts';

const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ZkAAAAASUVORK5CYII=';
test('imagens: preserva bytes, limita tamanho, valida formato e limpa nome', async () => {
  const foto = arquivoParaFile({ nome: '../../nota fiscal.php', tipo: 'image/png', base64 });
  assert.equal(foto.type, 'image/png');
  assert.ok(!foto.name.includes('/')); assert.ok(foto.name.endsWith('.png'));
  assert.equal(Buffer.from(await foto.arrayBuffer()).toString('base64'), base64);
  for (const entrada of [
    { tipo: 'image/jpeg', base64 },
    { tipo: 'text/html', base64 },
    { tipo: 'image/png', base64: `<script>${base64}` },
    { tipo: 'image/png', base64: '' },
    { tipo: 'image/png', base64: Buffer.alloc(MAX_ARQUIVO_BYTES + 1).toString('base64') },
  ]) assert.throws(() => arquivoParaFile({ nome: 'foto.png', ...entrada }));
});
