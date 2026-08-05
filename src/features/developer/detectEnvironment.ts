import type { EnvironmentKind } from "./types";

const LOCAL_URL_PATTERN = /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i;

export function detectEnvironment(supabaseUrl: string): EnvironmentKind {
  return LOCAL_URL_PATTERN.test(supabaseUrl.trim()) ? "local" : "hosted";
}
