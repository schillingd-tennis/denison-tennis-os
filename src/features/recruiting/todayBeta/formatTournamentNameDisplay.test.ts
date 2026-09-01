import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTournamentNameDisplay } from "./formatTournamentNameDisplay";

describe("formatTournamentNameDisplay", () => {
  it("8. ALL CAPS tournament name becomes readable mixed case", () => {
    assert.equal(
      formatTournamentNameDisplay("L3 ELLESSE JR. CHMP. AT THE CINCINNATI O"),
      "L3 Ellesse Jr. Chmp. at the Cincinnati O",
    );
  });

  it("9. USTA remains uppercase", () => {
    assert.equal(
      formatTournamentNameDisplay("L1 USTA B16,18 NATIIONAL CHMPS."),
      "L1 USTA B16,18 Natiional Chmps.",
    );
  });

  it("10. L1/L2/L3 remain uppercase", () => {
    assert.equal(formatTournamentNameDisplay("L2 OPEN"), "L2 Open");
    assert.equal(formatTournamentNameDisplay("L3 EVENT"), "L3 Event");
  });

  it("11. already normally formatted tournament names are not damaged", () => {
    const mixed = "Boys' 16-18 USTA National Clay Court Championships";
    assert.equal(formatTournamentNameDisplay(mixed), mixed);
  });

  it("preserves BG18 token", () => {
    assert.equal(
      formatTournamentNameDisplay("L3 BG18 OUTDOOR BY ELITE TENNIS ACADEMY"),
      "L3 BG18 Outdoor by Elite Tennis Academy",
    );
  });
});
