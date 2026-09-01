/** Browser origins permitted to call the loopback UTR Results Agent directly. */
export const UTR_AGENT_ALLOWED_BROWSER_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://denison-tennis-os.vercel.app",
] as const;

export function isAllowedUtrAgentBrowserOrigin(origin: string | undefined | null): boolean {
  if (!origin?.trim()) return false;
  return (UTR_AGENT_ALLOWED_BROWSER_ORIGINS as readonly string[]).includes(origin.trim());
}
