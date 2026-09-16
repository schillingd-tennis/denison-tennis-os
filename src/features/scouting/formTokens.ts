import { createHash, randomBytes } from "node:crypto";

export {
  SCOUTING_PUBLIC_FORM_ROUTE,
  isScoutingPublicFormPath,
  scoutingFormPublicPath,
} from "./formPaths";

export function hashScoutingFormToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function mintScoutingFormToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashScoutingFormToken(rawToken) };
}
