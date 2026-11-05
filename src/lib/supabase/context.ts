import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Cada chamada MCP usa o usuário do token, inclusive nas actions aninhadas.
export const supabaseContext = new AsyncLocalStorage<SupabaseClient<Database>>();
