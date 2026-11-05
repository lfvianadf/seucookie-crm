import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export function mcpUserAllowed(id: string) {
  return (process.env.MCP_ALLOWED_USER_IDS ?? "").split(",").map((s) => s.trim()).includes(id);
}

export function mcpOrigin() {
  const url = new URL(process.env.MCP_PUBLIC_URL!);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("MCP_PUBLIC_URL precisa usar HTTPS.");
  }
  return url.origin;
}

export async function authenticateMcp(request: Request) {
  if (!process.env.MCP_PUBLIC_URL || !process.env.MCP_OAUTH_CLIENT_ID || !process.env.MCP_ALLOWED_USER_IDS) {
    return new Response("MCP ainda não configurado.", { status: 503 });
  }
  const origin = request.headers.get("origin");
  const allowedOrigins = [mcpOrigin(), ...(process.env.MCP_ALLOWED_ORIGINS ?? "").split(",").filter(Boolean)];
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response("Origem não permitida.", { status: 403 });
  }

  const match = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "");
  const unauthorized = () => new Response("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": `Bearer resource_metadata="${mcpOrigin()}/.well-known/oauth-protected-resource"` },
  });
  if (!match) return unauthorized();

  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${match[1]}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data, error } = await client.auth.getClaims(match[1]).catch(() => ({ data: null, error: true }));
  const claims = data?.claims;
  if (error || !claims) return unauthorized();
  if (claims.iss !== `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1` ||
      claims.aud !== "authenticated" || claims.role !== "authenticated" ||
      claims.client_id !== process.env.MCP_OAUTH_CLIENT_ID || !mcpUserAllowed(claims.sub)) {
    return new Response("Usuário ou aplicativo sem acesso ao MCP.", { status: 403 });
  }
  return client;
}
