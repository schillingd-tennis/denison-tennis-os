import { execFileSync } from "node:child_process";

import type { SecretStorePort } from "./ports";

/** Preferred WhatsApp Keychain service. */
export const WHATSAPP_KEYCHAIN_SERVICE = "com.denison.tennis-os.whatsapp";
/** Fallback: Apple Messages Keychain (same verified project). */
export const APPLE_MESSAGES_KEYCHAIN_SERVICE = "com.denison.tennis-os.apple-messages";
export const KEYCHAIN_ACCOUNT = "supabase-service-role";
export const KEYCHAIN_SECURITY_BIN = "/usr/bin/security";

export type CommandRunner = (file: string, args: readonly string[]) => string;

export class KeychainUnavailableError extends Error {
  constructor(message = "WhatsApp service-role credential is unavailable in Keychain.") {
    super(message);
    this.name = "KeychainUnavailableError";
  }
}

/** Default runner. Tests must inject a mock; never call this against the real Keychain in tests. */
export function defaultSecurityRunner(file: string, args: readonly string[]): string {
  return execFileSync(file, [...args], { encoding: "utf8" });
}

function readGenericPassword(run: CommandRunner, service: string): string | null {
  try {
    const secret = run(KEYCHAIN_SECURITY_BIN, [
      "find-generic-password",
      "-s",
      service,
      "-a",
      KEYCHAIN_ACCOUNT,
      "-w",
    ]).trim();
    return secret.length > 0 ? secret : null;
  } catch {
    return null;
  }
}

/**
 * Prefer WhatsApp Keychain entry; fall back to Apple Messages when missing
 * (same verified Supabase project — avoids blocking live setup).
 */
export function createKeychainSecretStore(run: CommandRunner): SecretStorePort {
  return {
    readServiceRole() {
      return (
        readGenericPassword(run, WHATSAPP_KEYCHAIN_SERVICE) ??
        readGenericPassword(run, APPLE_MESSAGES_KEYCHAIN_SERVICE)
      );
    },
  };
}

export function createMemorySecretStore(secret: string | null): SecretStorePort {
  return {
    readServiceRole() {
      return secret;
    },
  };
}
