import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  corsHeadersForOrigin,
  isAllowedBrowserOrigin,
} from "./cors.js";

describe("UTR agent CORS", () => {
  it("allows localhost and production Denison origins", () => {
    assert.equal(isAllowedBrowserOrigin("http://localhost:3000"), true);
    assert.equal(isAllowedBrowserOrigin("http://localhost:3001"), true);
    assert.equal(isAllowedBrowserOrigin("https://denison-tennis-os.vercel.app"), true);
  });

  it("rejects disallowed origins", () => {
    assert.equal(isAllowedBrowserOrigin("https://evil.example"), false);
    assert.equal(isAllowedBrowserOrigin(undefined), false);
  });

  it("returns CORS headers for allowed origin", () => {
    const headers = corsHeadersForOrigin("https://denison-tennis-os.vercel.app", {
      privateNetwork: true,
    });
    assert.ok(headers);
    assert.equal(headers?.["Access-Control-Allow-Origin"], "https://denison-tennis-os.vercel.app");
    assert.match(headers?.["Access-Control-Allow-Methods"] ?? "", /OPTIONS/);
    assert.equal(headers?.["Access-Control-Allow-Private-Network"], "true");
  });
});
