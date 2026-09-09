import { createHash, randomBytes } from "node:crypto";

export const SCOUTING_PUBLIC_FORM_ROUTE = "/scouting-form";

export function hashScoutingFormToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function mintScoutingFormToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashScoutingFormToken(rawToken) };
}

export function scoutingFormPublicPath(rawToken: string): string {
  return `${SCOUTING_PUBLIC_FORM_ROUTE}/${encodeURIComponent(rawToken)}`;
}

export function isScoutingPublicFormPath(pathname: string): boolean {
  return (
    pathname === SCOUTING_PUBLIC_FORM_ROUTE ||
    pathname.startsWith(`${SCOUTING_PUBLIC_FORM_ROUTE}/`)
  );
}
