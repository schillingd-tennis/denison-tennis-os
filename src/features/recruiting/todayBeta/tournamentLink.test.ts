import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildUtrEventUrl, resolveTournamentUrl } from "./tournamentLink";

describe("tournamentLink", () => {
  it("builds UTR event URL from numeric event id", () => {
    assert.equal(buildUtrEventUrl(3465797), "https://app.utrsports.net/events/3465797");
    assert.equal(buildUtrEventUrl("390902"), "https://app.utrsports.net/events/390902");
  });

  it("rejects non-numeric event ids", () => {
    assert.equal(buildUtrEventUrl(undefined), undefined);
    assert.equal(buildUtrEventUrl(""), undefined);
    assert.equal(buildUtrEventUrl("abc"), undefined);
  });

  it("resolveTournamentUrl returns stored https URL only", () => {
    assert.equal(
      resolveTournamentUrl({
        tournamentUrl: "https://app.utrsports.net/events/3465797",
      }),
      "https://app.utrsports.net/events/3465797",
    );
    assert.equal(resolveTournamentUrl({ tournamentUrl: undefined }), undefined);
    assert.equal(resolveTournamentUrl({ tournamentUrl: "not-a-url" }), undefined);
  });
});
