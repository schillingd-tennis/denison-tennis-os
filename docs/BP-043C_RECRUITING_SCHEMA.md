# BP-043C — Recruiting Schema & Field Catalog

**Status:** Data foundation only. No Recruiting UI, Coda import, analytics engine, communication workflows, or scouting.

**Architecture:** [`BP-043B_RECRUITING_DATA_ARCHITECTURE.md`](./BP-043B_RECRUITING_DATA_ARCHITECTURE.md)

---

## 1. Tables / entities added

| Table | Role |
|---|---|
| `recruit_profiles` | 1:1 recruiting profile keyed by `person_id` |
| `recruit_types` | Recruit Type lookup |
| `recruit_pipeline_stages` | Pipeline Stage lookup |
| `recruit_interests` | Interest lookup |
| `recruit_outcomes` | Outcome lookup |
| `recruit_priorities` | Coach Priority lookup |
| `recruit_getabilities` | Getability lookup |
| `recruit_preread_statuses` | Preread color lookup |

No analytics, communication, scouting, or metric-snapshot tables.

---

## 2. Person fields added

On `production_people` / `Person` (current facts; not Coda calculated ranks):

| Domain | Column | Notes |
|---|---|---|
| `trnRank` | `trn_rank` | Raw TennisRecruiting.net rank |
| `trnStarRating` | `trn_star_rating` | 3 / 4 / 5 |
| `trnUrl` | `trn_url` | |
| `utrUrl` | `utr_url` | |
| `utrMatchesPlayed` | `utr_matches_played` | UTR match volume |
| `videoUrl` | `video_url` | |
| `highSchool` | `high_school` | Origin school; **not** duplicated on Recruit Profile |

**Not added (already on Person):** UTR, WTN, name, email, phone, hometown/address, class year.

**Not added:** Coda `International` (always `0` in the export). International remains a Recruit Type lookup value for future use, not a Person boolean.

**Not added:** calculated TR Rank, UTR Rank, WTN Rank, Z scores, Weighted Score, Composite Rank/Z, Reliability, Adjusted TR Rank, Reliability Score, Tier.

---

## 3. Lookup / reference values added

Fixed UUIDs live in `src/features/recruiting/lookupSeed.ts` and migration `0014`.

**Recruit Type:** `high_school`, `transfer`, `international`  
**Pipeline:** `potential`, `active`, `committed`, `closed`, `unknown`  
(Coda `Transfer` is a type, not a pipeline value.)  
**Interest:** `high`, `medium`, `low`, `unknown`  
**Outcome:** `committed_denison`, `committed_elsewhere`, `no_longer_recruiting` (NULL = none)  
**Priority:** `elite`, `significant`, `potential`, `probably_not`  
**Getability:** `highly_likely`, `great_chance`, `have_a_chance`, `unlikely`, `no_chance`  
**Preread:** `green`, `yellow`

---

## 4. Relationships

```
production_people.id  (text PK)
        │ 1:1 unique
        ▼
recruit_profiles.person_id  ON DELETE CASCADE

recruit_profiles.*_id  →  classification/evaluation/admissions lookup UUIDs
```

Recruit Profile is not a second identity. Role `recruit` remains on Person.

---

## 5. Nullability

All new Person columns are nullable (existing roster rows unchanged).

Recruit Profile: `id`, `person_id`, `created_at`, `updated_at` NOT NULL. Classification, evaluation, academics, admissions, notes, and Coda source columns are nullable.

`focus` is nullable boolean (unset ≠ false).

---

## 6. Indexes

- `recruit_profiles.person_id` UNIQUE (1:1)  
- `recruit_profiles.coda_row_id` UNIQUE (NULLs allowed)  
- Lookup `key` UNIQUE  

No extra secondary indexes.

---

## 7. codaRowId / codaExport strategy

| Column | Purpose |
|---|---|
| `coda_row_id` | Primary Coda row id for this Person |
| `coda_export` | `jsonb` complete original export row (`Record<string, unknown>`) |
| `coda_pipeline_stage` | Raw overloaded Pipeline Stage string |
| `coda_interest` | Raw overloaded Interest string |

`coda_export` is not cleaned or flattened. Import is **not** implemented in this milestone.

---

## 8. Analytics intentionally deferred

Compatibility rules (document only; **not** schema or code):

- Pool = Person `wtn` present  
- Weights 30% TR / 40% UTR / 30% WTN; renormalize when TR missing  
- Sample SD; TR Z and WTN Z inverted; UTR Z not inverted  
- Reliability = `min(matches/30, 1)`; blank matches → 1 in Coda  
- Adjusted TR Rank shrinks toward **90.48** (v1 constant)  
- `-1` rank sentinel outside the pool  
- Tier from Composite Z (Core is `> -0.75`)  
- Composite Rank ranks Weighted Score (tie rule still PARTIAL)

These are computed later. They are not Person or Recruit Profile columns.

---

## 9. Import intentionally deferred

No Coda Excel/CSV load. No recruit seed. No production People rows created or updated by this milestone. Duplicate audit is a later BP.

---

## 10. Validation results

See the BP-043C implementation report (tsc, ESLint, `npm run build`). Existing Player / Coach / Family workspaces and Team directory were not given new Recruiting UI; new Person tennis/school fields are catalog-registered without Adaptive Workspace membership, so Travel / Contact / Family layouts are unchanged.

---

## 11. Files changed

See implementation report file list.

---

## Architecture note (High School)

BP-043C’s prompt listed High School under both Person and Recruit Profile Academic. BP-043B places High School on **Person only**. Implementation follows BP-043B to avoid duplicating the field. GPA / SAT / ACT / academic interests remain on Recruit Profile.
