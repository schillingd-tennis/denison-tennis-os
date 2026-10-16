import assert from "node:assert/strict";
import test from "node:test";
import { lookupPublicTrnPlayer, parsePublicTrnProfile } from "./publicTrnLookup";

test("parses public TRN hometown, class, rank and stars", () => {
  const parsed = parsePublicTrnProfile("<main>Hometown: Columbus, OH Graduation Year: 2028 National Rank: #42 4-Star</main>", "https://www.tennisrecruiting.net/player.asp?id=42");
  assert.deepEqual(parsed, { profileUrl: "https://www.tennisrecruiting.net/player.asp?id=42", city: "Columbus", state: "OH", classYear: 2028, rank: 42, starRating: 4 });
});

test("public lookup rejects Cloudflare challenge pages without asking for login", async () => {
  const fakeFetch = async () => new Response("<title>Just a moment...</title><script src='/challenge-platform/x'></script>", { status: 200 });
  assert.equal(await lookupPublicTrnPlayer("Test Player", fakeFetch as typeof fetch), null);
});
