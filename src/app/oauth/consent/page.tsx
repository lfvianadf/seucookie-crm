import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mcpUserAllowed } from "@/lib/mcp/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ConsentPage({ searchParams }: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: id } = await searchParams;
  if (!id) return <p className="p-8">Solicitação de autorização ausente.</p>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?authorization_id=${encodeURIComponent(id)}`);
  if (!mcpUserAllowed(user.id)) return <p className="p-8">Sua conta não tem acesso à integração.</p>;
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) return <p className="p-8">Solicitação inválida ou expirada. Inicie a conexão novamente pelo plugin.</p>;
  if ("redirect_url" in data) redirect(data.redirect_url);
  if (data.client.id !== process.env.MCP_OAUTH_CLIENT_ID) {
    return <p className="p-8">Este aplicativo não está autorizado a conectar ao CRM.</p>;
  }

  async function decidir(formData: FormData) {
    "use server";
    const client = await createClient();
    const { data: { user: currentUser } } = await client.auth.getUser();
    if (!currentUser || !mcpUserAllowed(currentUser.id)) throw new Error("Acesso negado.");
    const { data: details, error: detailsError } = await client.auth.oauth.getAuthorizationDetails(id!);
    if (detailsError || !details) throw new Error("Solicitação inválida ou expirada.");
    if ("redirect_url" in details) redirect(details.redirect_url);
    if (details.client.id !== process.env.MCP_OAUTH_CLIENT_ID) throw new Error("Aplicativo não autorizado.");
    const result = formData.get("decisao") === "permitir"
      ? await client.auth.oauth.approveAuthorization(id!, { skipBrowserRedirect: true })
      : await client.auth.oauth.denyAuthorization(id!, { skipBrowserRedirect: true });
    if (result.error || !result.data) throw new Error("Não foi possível concluir a autorização. Tente novamente.");
    redirect(result.data.redirect_url);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutro-50 p-6">
      <div className="w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-md">
        <h1 className="mb-4 text-xl font-semibold">Conectar ao Seu Cookie</h1>
        <p><strong>{data.client.name}</strong> está solicitando acesso como {user.email}.</p>
        <p className="mt-4">Ao permitir, o aplicativo poderá consultar clientes, pedidos, custos e estoque; cadastrar e atualizar produtos, insumos e receitas; registrar compras, produção e pedidos.</p>
        {data.scope && <p className="mt-4 text-sm text-neutro-500">Permissões solicitadas: {data.scope}</p>}
        <p className="mt-4 text-sm text-neutro-500">Você pode revogar esta conexão nas configurações do plugin.</p>
        <form action={decidir} className="mt-6 flex gap-3">
          <SubmitButton name="decisao" value="negar" variant="secondary">Negar</SubmitButton>
          <SubmitButton name="decisao" value="permitir">Permitir acesso</SubmitButton>
        </form>
      </div>
    </main>
  );
}
