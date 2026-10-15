import assert from "node:assert/strict";
import test from "node:test";

import { importTournamentUrl } from "./urlImport";

test("imports the supplied USTA tournament into a reviewable tournament draft", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      data: {
        publishedTournament: {
          name: "ITA Great Pumpkin Junior Sectional Championships",
          identificationCode: "26-35928",
          primaryLocation: {
            name: "Darling Memorial Tennis Center",
            address1: "7901 W WASHINGTON AVE",
            address2: null,
            country: "US",
            county: "NV",
            postcode: "89128",
            town: "LAS VEGAS",
          },
          timings: {
            startDate: "2026-10-31",
            endDate: "2026-11-02",
            timeZone: "America/Los_Angeles",
            startDateTime: "2026-10-31T07:00:00.000Z",
          },
          level: { name: "Level 3 Closed", shortName: "3 Closed" },
          registrationRestrictions: {
            entriesOpenDateTime: "2026-01-14T17:00:00.000Z",
            entriesCloseDateTime: "2026-10-04T21:59:00.000Z",
          },
          websiteContent: { tournamentDetails: "Outdoor hard courts", entryInformation: "" },
        },
      },
    }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const result = await importTournamentUrl(
      "https://playtennis.usta.com/Competitions/USTANevadaDistrict/Tournaments/Overview/b4eb946b-04ae-4f4f-9797-f2704defb1e1",
    );
    assert.equal(result.source, "USTA Play Tennis");
    assert.equal(result.input.name, "ITA Great Pumpkin Junior Sectional Championships");
    assert.equal(result.input.startDate, "2026-10-31");
    assert.equal(result.input.endDate, "2026-11-02");
    assert.equal(result.input.location, "Las Vegas, NV");
    assert.equal(result.input.venue, "Darling Memorial Tennis Center");
    assert.equal(result.input.level, "Level 3 Closed");
    assert.equal(result.input.entryType, "Closed");
    assert.equal(result.input.surface, "Hard");
    assert.match(result.input.additionalNotes ?? "", /USTA tournament ID: 26-35928/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects non-HTTPS and local URLs", async () => {
  await assert.rejects(() => importTournamentUrl("http://example.com/event"), /must use HTTPS/);
  await assert.rejects(() => importTournamentUrl("https://localhost/event"), /not supported/);
});
