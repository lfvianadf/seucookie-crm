import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// PGLITE_MODULE permite executar sem adicionar um banco de testes ao app.
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite');

test('receitas e pedidos são atômicos; estoque e composição são validados', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
      set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';`);
    await db.exec((await readFile('supabase/schema.sql', 'utf8')).replace('create extension if not exists "pgcrypto";', ''));
    for (const file of [
      '2026-07-13_qtd_estoque_produtos.sql',
      '2026-07-13_estoque_pedido_itens_update_delete.sql',
      '2026-07-14_tipo_produto_box.sql',
      '2026-07-14_pedido_item_composicao.sql',
      '2026-08-04_preco_variavel_box.sql',
      '2026-08-31_tipo_venda_e_canal.sql',
      '2026-09-07_pedido_ifood.sql',
      '2026-09-07b_pedido_ifood_valor_liquido.sql',
      '20261105221328_crm_mcp_atomic_writes.sql',
    ]) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
    const insumo = await scalar("insert into insumos(nome, unidade_base) values('Farinha', 'g') returning id");
    const ingredients = JSON.stringify([{ insumo_id: insumo, quantidade: 100 }]);
    const receita = await scalar('select salvar_receita_crm(null, $1, 10, $2)', ['Teste', ingredients]);
    const invalid = JSON.stringify([{ insumo_id: '00000000-0000-4000-8000-000000000999', quantidade: 20 }]);
    await assert.rejects(db.query('select salvar_receita_crm($1, $2, 20, $3)', [receita, 'Inválida', invalid]));
    assert.equal(await scalar('select nome from receitas where id=$1', [receita]), 'Teste');
    assert.equal(Number(await scalar('select quantidade from receita_insumos where receita_id=$1', [receita])), 100);
    await assert.rejects(db.query('select salvar_receita_crm(null, $1, 20, $2)', ['Inválida', invalid]));
    assert.equal(Number(await scalar('select count(*) from receitas')), 1);
    const cliente = await scalar("insert into clientes(nome, telefone) values('Cliente Teste','84999998888') returning id");
    const cookie = await scalar("insert into produtos(nome, preco, qtd_estoque) values('Cookie', 10, 10) returning id");
    const box = await scalar("insert into produtos(nome, preco, tipo_produto, qtd_cookies_box) values('Box', 30, 'box', 2) returning id");
    await db.query('insert into produto_box_itens values($1,$2)', [box, cookie]);
    const order = async (itens) => scalar("select criar_pedido_crm($1,$2,null,'varejo',null,'manual',null)", [cliente, JSON.stringify(itens)]);
    const item = { produto_id: cookie, quantidade: 2, preco_unitario: 10 };
    await order([item]);
    assert.equal(Number(await scalar('select qtd_estoque from produtos where id=$1', [cookie])), 8);
    await assert.rejects(order([item, { ...item, quantidade: 100 }]));
    assert.equal(Number(await scalar('select count(*) from pedidos')), 1);
    assert.equal(Number(await scalar('select qtd_estoque from produtos where id=$1', [cookie])), 8);
    await assert.rejects(order([{ produto_id: box, quantidade: 1, preco_unitario: 30, composicao: [{ cookieProdutoId: cookie, quantidade: 1 }] }]));
    await order([{ produto_id: box, quantidade: 1, preco_unitario: 30, composicao: [{ cookieProdutoId: cookie, quantidade: 2 }] }]);
    assert.equal(Number(await scalar('select qtd_estoque from produtos where id=$1', [cookie])), 6);
    assert.equal(await scalar("select has_function_privilege('anon', 'salvar_receita_crm(uuid,text,integer,jsonb)', 'execute')"), false);
    assert.equal(await scalar("select has_function_privilege('anon', 'criar_pedido_crm(uuid,jsonb,text,pedido_tipo_venda,timestamp with time zone,pedido_origem,numeric)', 'execute')"), false);
    await db.exec("set request.jwt.claim.sub = ''");
    await assert.rejects(order([item]), /Autenticação/);
  } finally { await db.close(); }
});
