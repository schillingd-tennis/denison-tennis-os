import { execFileSync } from "node:child_process";

import type { SecretStorePort } from "./ports";

export const KEYCHAIN_SERVICE = "com.denison.tennis-os.apple-messages";
export const KEYCHAIN_ACCOUNT = "supabase-service-role";
export const KEYCHAIN_SECURITY_BIN = "/usr/bin/security";

export type CommandRunner = (file: string, args: readonly string[]) => string;

export class KeychainUnavailableError extends Error {
  constructor(message = "Apple Messages service-role credential is unavailable in Keychain.") {
    super(message);
    this.name = "KeychainUnavailableError";
  }
}

/** Default runner. Tests must inject a mock; never call this against the real Keychain in tests. */
export function defaultSecurityRunner(file: string, args: readonly string[]): string {
  return execFileSync(file, [...args], { encoding: "utf8" });
}

export function createKeychainSecretStore(run: CommandRunner): SecretStorePort {
  return {
    readServiceRole() {
      try {
        const secret = run(KEYCHAIN_SECURITY_BIN, [
          "find-generic-password",
          "-s",
          KEYCHAIN_SERVICE,
          "-a",
          KEYCHAIN_ACCOUNT,
          "-w",
        ]).trim();
        return secret.length > 0 ? secret : null;
      } catch {
        return null;
      }
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
