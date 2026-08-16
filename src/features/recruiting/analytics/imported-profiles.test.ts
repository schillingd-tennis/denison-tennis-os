import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadEnvConfig } from "@next/env";
import { computeRecruitingAnalytics } from "./engine";
import { subjectFromPerson } from "./fromPerson";

loadEnvConfig(process.cwd());

type PersonRow = {
  id: string;
  trn_rank: number | null;
  utr: number | null;
  wtn: number | null;
  utr_matches_played: number | null;
};

/**
 * Validates the engine against tennis facts on imported Recruit Profiles.
 * Skips when local Supabase is not reachable so unit tests stay deterministic.
 */
describe("imported RecruitProfile tennis facts", () => {
  it("recomputes a 185-row WTN pool from stored Person ratings", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return;
    }

    const { supabase } = await import("../../../lib/supabase");
    const { data: profiles, error: profileError } = await supabase
      .from("recruit_profiles")
      .select("person_id")
      .limit(1000);
    if (profileError) {
      return;
    }
    const personIds = (profiles ?? []).map((row: { person_id: string }) => row.person_id);
    if (personIds.length === 0) return;

    const { data: people, error: peopleError } = await supabase
      .from("production_people")
      .select("id, trn_rank, utr, wtn, utr_matches_played, roles!role_id ( key )")
      .in("id", personIds);
    if (peopleError || !people) {
      return;
    }

    assert.equal(people.length, 461);
    const currentRecruits = (people as (PersonRow & { roles: { key: string } | { key: string }[] | null })[]).filter(
      (row) => {
        const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
        return role?.key === "recruit";
      },
    );
    const results = computeRecruitingAnalytics(
      currentRecruits.map((row) =>
        subjectFromPerson({
          id: row.id,
          trnRank: row.trn_rank,
          utr: row.utr,
          wtn: row.wtn,
          utrMatchesPlayed: row.utr_matches_played,
        }),
      ),
    );
    assert.equal(results.filter((row) => row.inPool).length, 185);
  });
});
