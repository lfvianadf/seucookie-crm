import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcp } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";
import { supabaseContext } from "@/lib/supabase/context";
import { MAX_MCP_BODY_BYTES } from "@/lib/mcp/arquivos";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const client = await authenticateMcp(request);
  if (client instanceof Response) return client;
  if (Number(request.headers.get("content-length")) > MAX_MCP_BODY_BYTES) {
    return new Response("Requisição muito grande.", { status: 413 });
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_MCP_BODY_BYTES) {
        await reader.cancel();
        return new Response("Requisição muito grande.", { status: 413 });
      }
      chunks.push(value);
    }
  }
  const body = Buffer.concat(chunks).toString("utf8");
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    const response = await supabaseContext.run(client, () => transport.handleRequest(new Request(request.url, { method: "POST", headers: request.headers, body })));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally {
    await server.close();
  }
}

export async function GET(request: Request) {
  const client = await authenticateMcp(request);
  if (client instanceof Response) return client;
  return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
}
