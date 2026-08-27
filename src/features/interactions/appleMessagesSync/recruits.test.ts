import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";

import { matchSetsFromProductionRows } from "./recruits";

test("production match sets exclude current players even with recruit profiles", () => {
  const sets = matchSetsFromProductionRows(
    [{ person_id: "luke" }, { person_id: "alex" }, { person_id: "luke-carter" }],
    [
      {
        id: "luke",
        first_name: "L",
        last_name: "C",
        preferred_name: null,
        cell_phone: "+19735550199",
        personal_email: null,
        denison_email: null,
        role: { key: ROLE_KEYS.player },
        status: { key: STATUS_KEYS.current },
      },
      {
        id: "alex",
        first_name: "A",
        last_name: "R",
        preferred_name: null,
        cell_phone: "+19735550101",
        personal_email: null,
        denison_email: null,
        role: { key: ROLE_KEYS.recruit },
        status: { key: STATUS_KEYS.current },
      },
      {
        id: "luke-carter",
        first_name: "L",
        last_name: "K",
        preferred_name: null,
        cell_phone: "+19735550102",
        personal_email: null,
        denison_email: null,
        role: { key: ROLE_KEYS.recruit },
        status: { key: STATUS_KEYS.current },
      },
    ],
  );
  assert.deepEqual(
    sets.recruits.map((row) => row.id).sort(),
    ["alex", "luke-carter"],
  );
  assert.deepEqual(
    sets.currentTeam.map((row) => row.id),
    ["luke"],
  );
});
