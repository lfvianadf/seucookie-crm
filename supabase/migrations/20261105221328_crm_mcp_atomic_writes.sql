-- Actions da interface e do MCP compartilham estas transações.
create or replace function public.salvar_receita_crm(
  p_id uuid, p_nome text, p_rendimento integer, p_itens jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  if nullif(trim(p_nome), '') is null or p_rendimento is null or p_rendimento <= 0
    or jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nome, rendimento positivo e insumos são obrigatórios';
  end if;
  if p_id is null then
    insert into receitas(nome, rendimento_cookies) values(trim(p_nome), p_rendimento) returning id into v_id;
  else
    update receitas set nome = trim(p_nome), rendimento_cookies = p_rendimento where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Receita não encontrada'; end if;
    delete from receita_insumos where receita_id = v_id;
  end if;
  insert into receita_insumos(receita_id, insumo_id, quantidade)
    select v_id, x.insumo_id, x.quantidade
    from jsonb_to_recordset(p_itens) as x(insumo_id uuid, quantidade numeric);
  return v_id;
end $$;

create or replace function public.criar_pedido_crm(
  p_cliente_id uuid, p_itens jsonb, p_observacoes text,
  p_tipo_venda public.pedido_tipo_venda, p_data_entrega timestamptz,
  p_origem public.pedido_origem, p_valor_liquido numeric
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_produto produtos%rowtype;
  v_cookie jsonb;
  v_total numeric := 0;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido precisa de itens';
  end if;
  for v_item in select * from jsonb_array_elements(p_itens) loop
    if (v_item->>'quantidade')::integer is null or (v_item->>'quantidade')::integer <= 0
      or (v_item->>'preco_unitario')::numeric is null or (v_item->>'preco_unitario')::numeric < 0 then
      raise exception 'Quantidade ou preço inválido';
    end if;
    v_total := v_total + (v_item->>'quantidade')::integer * (v_item->>'preco_unitario')::numeric;
  end loop;
  insert into pedidos(cliente_id, origem, status, valor_total, valor_liquido_recebido, observacoes, tipo_venda, data_entrega_prevista)
    values(p_cliente_id, p_origem, 'novo', v_total, p_valor_liquido, nullif(p_observacoes, ''), p_tipo_venda, p_data_entrega)
    returning id into v_id;
  for v_item in select * from jsonb_array_elements(p_itens) loop
    select * into strict v_produto from produtos where id = (v_item->>'produto_id')::uuid for update;
    if v_produto.tipo_produto = 'cookie' and v_produto.qtd_estoque < (v_item->>'quantidade')::integer then
      raise exception 'Estoque insuficiente para %', v_produto.nome;
    end if;
    if v_produto.tipo_produto = 'box' and (
      jsonb_typeof(v_item->'composicao') is distinct from 'array'
      or coalesce((select sum((x->>'quantidade')::integer) from jsonb_array_elements(v_item->'composicao') x), 0)
        <> v_produto.qtd_cookies_box * (v_item->>'quantidade')::integer
    ) then raise exception 'A composição da box precisa corresponder à quantidade de cookies'; end if;
    insert into pedido_itens(pedido_id, produto_id, quantidade, preco_unitario)
      values(v_id, v_produto.id, (v_item->>'quantidade')::integer, (v_item->>'preco_unitario')::numeric) returning id into v_item_id;
    if v_produto.tipo_produto = 'box' then
      for v_cookie in select * from jsonb_array_elements(v_item->'composicao') loop
        if (v_cookie->>'quantidade')::integer is null or (v_cookie->>'quantidade')::integer <= 0 then
          raise exception 'Quantidade de cookie inválida';
        end if;
        perform 1 from produtos p join produto_box_itens b on b.cookie_id = p.id
          where b.box_id = v_produto.id and p.id = (v_cookie->>'cookieProdutoId')::uuid
            and p.tipo_produto = 'cookie' and p.qtd_estoque >= (v_cookie->>'quantidade')::integer for update of p;
        if not found then raise exception 'Cookie fora do cardápio da box ou estoque insuficiente'; end if;
        insert into pedido_item_composicao(pedido_item_id, cookie_produto_id, quantidade)
          values(v_item_id, (v_cookie->>'cookieProdutoId')::uuid, (v_cookie->>'quantidade')::integer);
      end loop;
    elsif jsonb_array_length(coalesce(v_item->'composicao', '[]'::jsonb)) > 0 then
      raise exception 'Somente boxes possuem composição';
    end if;
  end loop;
  return v_id;
end $$;

revoke all on function public.salvar_receita_crm(uuid, text, integer, jsonb) from public, anon;
grant execute on function public.salvar_receita_crm(uuid, text, integer, jsonb) to authenticated;
revoke all on function public.criar_pedido_crm(uuid, jsonb, text, public.pedido_tipo_venda, timestamptz, public.pedido_origem, numeric) from public, anon;
grant execute on function public.criar_pedido_crm(uuid, jsonb, text, public.pedido_tipo_venda, timestamptz, public.pedido_origem, numeric) to authenticated;
