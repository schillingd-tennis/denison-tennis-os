import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createKeychainSecretStore,
  KEYCHAIN_SECURITY_BIN,
  KEYCHAIN_SERVICE,
  KEYCHAIN_ACCOUNT,
} from "./secrets";

test("Keychain adapter reads through the injected runner and never shells out in tests", () => {
  const calls: Array<{ file: string; args: readonly string[] }> = [];
  const store = createKeychainSecretStore((file, args) => {
    calls.push({ file, args });
    return "service-role-from-mock\n";
  });
  assert.equal(store.readServiceRole(), "service-role-from-mock");
  assert.equal(calls[0]?.file, KEYCHAIN_SECURITY_BIN);
  assert.equal(calls[0]?.file, "/usr/bin/security");
  assert.ok(calls[0]?.args.includes(KEYCHAIN_SERVICE));
  assert.ok(calls[0]?.args.includes(KEYCHAIN_ACCOUNT));
  assert.equal(KEYCHAIN_SERVICE, "com.denison.tennis-os.apple-messages");
  assert.equal(KEYCHAIN_ACCOUNT, "supabase-service-role");
});

test("Keychain adapter returns null when the injected runner fails", () => {
  const store = createKeychainSecretStore(() => {
    throw new Error("security failed");
  });
  assert.equal(store.readServiceRole(), null);
});
