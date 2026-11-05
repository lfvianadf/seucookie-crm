import { mcpOrigin } from "@/lib/mcp/auth";

export function GET() {
  if (!process.env.MCP_PUBLIC_URL) return new Response("MCP ainda não configurado.", { status: 503 });
  return Response.json({
    resource: `${mcpOrigin()}/api/mcp`,
    authorization_servers: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Seu Cookie CRM",
  }, { headers: { "Cache-Control": "no-store" } });
}
