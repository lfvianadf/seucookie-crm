import { createClient } from "@/lib/supabase/server";
import { EncomendasLista } from "@/components/encomendas-lista";
import { NovaEncomendaModal } from "@/components/nova-encomenda-modal";
import { PageHeader } from "@/components/ui/page-header";

export default async function EncomendasPage() {
  const supabase = await createClient();
  const [{ data: encomendas }, { data: produtos }, { data: boxItens }] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select(
          "id, status, valor_total, observacoes, data_pedido, data_entrega_prevista, clientes(nome, telefone, endereco), pedido_itens(id, produto_id, quantidade, preco_unitario, produtos(nome, tipo_produto)), encomenda_acertos(id)"
        )
        .eq("tipo_venda", "encomenda")
        .order("data_pedido", { ascending: false }),
      supabase
        .from("produtos")
        .select(
          "id, nome, preco, capitulo, tipo_produto, qtd_cookies_box, acrescimo_box"
        )
        // produto de encomenda tem disponivel=false sempre (não pode vazar
        // no site) — por isso o filtro aqui é por canal, não por disponivel,
        // ao contrário de /pedidos e do site público
        .in("canal", ["encomenda", "ambos"]),
      supabase.from("produto_box_itens").select("box_id, cookie_id"),
    ]);

  const produtosLista = produtos ?? [];

  const boxCookies: Record<
    string,
    { id: string; nome: string; preco: number; acrescimo_box: number }[]
  > = {};
  for (const item of boxItens ?? []) {
    const cookie = produtosLista.find((p) => p.id === item.cookie_id);
    if (!cookie) continue;
    (boxCookies[item.box_id] ??= []).push({
      id: cookie.id,
      nome: cookie.nome,
      preco: cookie.preco,
      acrescimo_box: cookie.acrescimo_box,
    });
  }

  return (
    <div>
      <PageHeader
        title="Encomendas"
        description="Venda consignada, preço de atacado — vira faturamento no acerto."
        action={
          <NovaEncomendaModal produtos={produtosLista} boxCookies={boxCookies} />
        }
      />

      <EncomendasLista encomendasIniciais={encomendas ?? []} />
    </div>
  );
}
