import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";

// Explicit process-local scope for trusted Mac workers. Never populated from request input.
export const workerSupabaseScope = new AsyncLocalStorage<SupabaseClient>();
