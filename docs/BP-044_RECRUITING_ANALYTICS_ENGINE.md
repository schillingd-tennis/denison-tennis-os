# BP-044 — Recruiting Analytics Engine

**Status:** Engine only. No Recruiting UI, Communication, Scouting, import, or Person/RecruitProfile writes.  
**Sources:** [`BP-043A_RECRUITING_FORMULA_RECONSTRUCTION.md`](./BP-043A_RECRUITING_FORMULA_RECONSTRUCTION.md), [`BP-043B_RECRUITING_DATA_ARCHITECTURE.md`](./BP-043B_RECRUITING_DATA_ARCHITECTURE.md), [`BP-043C_RECRUITING_SCHEMA.md`](./BP-043C_RECRUITING_SCHEMA.md), imported Coda tennis facts (461 Recruit Profiles / 474-row export fixture).

Analytics are **computed outputs**. They are not Person columns and are not stored on Recruit Profile.

---

## 1. What this engine is

`computeRecruitingAnalytics(subjects)` scores a cohort of tennis facts in one deterministic pass. Callers pass Person ratings (`trnRank`, `utr`, `wtn`, `utrMatchesPlayed`). The function returns ranks, z-scores, mix scores, reliability, and tier.

v1 reproduces Coda scoring, including documented quirks. It does not change the model.

---

## 2. Inputs (Person tennis facts)

| Input | Person field | Role |
|---|---|---|
| TRN Rank | `trnRank` | Raw TennisRecruiting.net rank. Lower is better. **Not** calculated TR Rank. |
| UTR | `utr` | Higher is better. |
| WTN | `wtn` | Lower is better. **Presence defines the analytics pool.** |
| Matches Played | `utrMatchesPlayed` | UTR match volume. |

Optional `utrInvalid` reproduces Coda’s dirty UTR string (`10.37 (10.95 doubles)`): UTR Rank = `-1`, no UTR Z. Cleaned numeric UTR on Person is still a rating; the flag is Coda-compat only.

---

## 3. Outputs (engine only)

| Output | Notes |
|---|---|
| WTN Rank | Competition rank of WTN in the pool (lower WTN = 1). |
| TR Rank | Competition rank of TRN in the pool; outside pool: lookup by exact TRN else `-1`. Blank if TRN is blank. |
| UTR Rank | Competition rank of UTR in the pool (higher UTR = 1); outside: lookup else `-1`. |
| TR Z | `round((μ_TRN − TRN) / s_sample, 2)` — inverted. Uses **TRN**, not TR Rank. |
| UTR Z | `round((UTR − μ_UTR) / s_sample, 2)` — not inverted. |
| WTN Z | `round((μ_WTN − WTN) / s_sample, 2)` — inverted. |
| Weighted Score | 30/40/30 mix of TR/UTR/WTN **ranks**. Lower is better. Pool only. |
| Composite Z | Same 30/40/30 mix of **unrounded** component Z, then round 2 dp. Higher is better. |
| Composite Rank | Competition rank of Weighted Score in the pool (lower WS = 1). |
| Reliability | `round(min(matches/30, 1), 2)`; blank matches → 1. |
| Adjusted TR Rank | Shrink TR Rank toward **90.48** using **unrounded** reliability. |
| Reliability Score | Weighted Score formula using Adjusted TR Rank. |
| Tier | Observed Coda bands of Composite Z. |

---

## 4. Audited Coda rules (frozen for v1)

1. **Pool = WTN present.** In the Coda export, n = 185. All 185 have numeric UTR; 180 have TRN.
2. **Competition ranks** (`RANK.EQ` / min-rank) are calculated **inside that pool**.
3. **Z-scores use sample SD** (`n − 1`) and **pool** means, then round to 2 decimals.
4. **TR Z and WTN Z are inverted** (lower TRN/WTN → higher Z). UTR Z is not.
5. **Weighted Score** = `0.30·TR Rank + 0.40·UTR Rank + 0.30·WTN Rank`. Missing TR Rank renormalizes onto the remaining 70%: `(0.40·UTR + 0.30·WTN) / 0.70`.
6. **Reliability** = `min(Matches Played / 30, 1)`; blank matches → 1. Use **raw** (unrounded) reliability in Adjusted TR Rank.
7. **Adjusted TR Rank** = `TR Rank × Rel + 90.48 × (1 − Rel)`. Constant **90.48** (`round(mean(pool TR Rank), 2)`), not a live mean. Blank TR Rank → blank. `-1` or outside pool → 90.48.
8. **Tier** from displayed Composite Z:

```
>= 1.50 → 1 - Elite
>= 0.75 → 2 - Strong
>  -0.75 → 3 - Core
>  -1.50 → 4 - Fringe
else     → 5 - Long Shot
```

**Core = Composite Z > −0.75.** Samuel Schumacher at **−0.75** is **4 - Fringe**.

90.48 is a **v1 legacy constant**, not recomputed each run.

---

## 5. Architecture

```
Person tennis facts
        │
        ▼
computeRecruitingAnalytics(cohort)
        │
        ▼
RecruitAnalyticsResult[]   ← not written to Person or Recruit Profile
```

| Path | Role |
|---|---|
| `src/features/recruiting/analytics/engine.ts` | Cohort pass |
| `src/features/recruiting/analytics/formulas.ts` | Mix, reliability, shrink, tier |
| `src/features/recruiting/analytics/math.ts` | Sample mean/SD, competition rank, round2 |
| `src/features/recruiting/analytics/fromPerson.ts` | Person → subject mapping |
| `src/features/recruiting/analytics/fixtures/coda-analytics-cohort.json` | 474 Coda rows used for validation |

The engine is independently testable (`npm run test:recruiting-analytics`). It does not import UI, communication, or scouting modules.

---

## 6. Validation

Tests use the Coda export tennis facts that were imported onto People / Recruit Profiles (474 rows, 185 with WTN). Known examples: Chase Gerloff (TRN **72**), Alonso Berry, Samuel Schumacher, Jason Eigbedion, Pietro Sagone / Yusaku Harashima (blank TR), Zhang/Chabot, Enzo Badotti Cariani (dirty UTR).

`imported-profiles.test.ts` also reads local `recruit_profiles` + `production_people` when Supabase env is available and asserts the imported 461 profiles still form a 185-row WTN pool. It does not write.

Run:

```
npx tsc --noEmit
npx eslint src/features/recruiting/analytics src/features/recruiting/index.ts
npm run test:recruiting-analytics
npm run build
```

---

## 7. Known discrepancies vs Coda (unchanged scoring model)

These are the BP-043A residuals. The engine does **not** invent extra rounding or tie-breaks to hide them.

| Item | Engine | Coda | Notes |
|---|---|---|---|
| Weighted Score | `round(30/40/30, 2)` | HIGH | Max abs ~0.06 (e.g. Noa Cakaric, Ethan Chen `70.34999999999999`). MAE ~0.009. |
| Reliability Score | Same mix on Adj TR | HIGH | Same residual pattern. |
| Adjusted TR Rank | half-away-from-zero 2 dp | HIGH | Aakash Deodhar / Shaw Akula ~0.006 vs Coda `113.13` / `63.65`. |
| Composite Z | unrounded Z mix, then round2 | HIGH | At most 0.01 on Ryan Wang / Gianluca Galasso depending on Coda’s half-even vs half-away. |
| Composite Rank | competition rank of displayed Weighted Score | PARTIAL | Neighbor swaps of ±1 where Coda’s stored WS differs from `round(30/40/30, 2)`. **Justin Zhang and Dante Chabot** both WS **51.20**; engine ranks both **51**; Coda displays **51 and 52**. Tie-break unrecovered. |
| Dirty UTR | `utrInvalid` → rank `-1`, no Z | — | If Person stores cleaned `10.37` without the flag, the engine will treat it as numeric UTR. |
| Chase Gerloff TRN | **72** in the export | Doc sketch said 68 | Engine follows the export. |

---

## 8. Out of scope

- Recruiting UI
- Communication engine work
- Tournament scouting
- Changing weights, pool definition, or tier bands
- Importing or mutating Person / RecruitProfile rows
- Persisting analytics columns
