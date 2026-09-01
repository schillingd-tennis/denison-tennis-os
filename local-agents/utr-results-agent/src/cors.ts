/** Must stay aligned with src/features/recruiting/todayBeta/utrAgentAllowedOrigins.ts */
export const ALLOWED_BROWSER_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://denison-tennis-os.vercel.app",
] as const;

export function isAllowedBrowserOrigin(origin: string | undefined | null): boolean {
  if (!origin?.trim()) return false;
  return (ALLOWED_BROWSER_ORIGINS as readonly string[]).includes(origin.trim());
}

export function corsHeadersForOrigin(origin: string | undefined | null): Record<string, string> | null {
  if (!isAllowedBrowserOrigin(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin!.trim(),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Denison-Utr-Agent-Secret",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
