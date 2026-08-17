# BP-043F — Recruiting Import Result

**Mode:** Executed against local Supabase (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`).  
**Source:** Coda `Recruits.xlxs.xlsx` (474 data rows).  
**Plan:** [`BP-043E_RECRUITING_IMPORT_PREVIEW.md`](./BP-043E_RECRUITING_IMPORT_PREVIEW.md).  
**Importer:** `scripts/import-coda-recruits.py` (idempotent on `production_people.id` = `recruit-xlsx-row-*` and `recruit_profiles.coda_row_id`).

No Recruiting UI, Analytics, Communication, or Scouting was built.

---

## Preflight

| Check | Result |
|---|---|
| Coda rows / columns | 474 / 67 |
| Disposition | 457 CREATE + 12 folded + 4 enrich + 1 skip = **474** |
| Migration 0014 | **Applied** this run (was missing; schema had stopped at 0013) |
| Migration 0015 `recruit_class_year` | **Applied** this run; column present |
| Lookups | types 3, pipeline 5, interest 4, outcome 3, priority 4, getability 5, preread 2 |
| `recruit_profiles` before import | **0** |
| `production_people` before import | **47** (roster seed, not 40) |
| Roster four `class_year` before | Berns/MacTaggart/Colson/Koido all **2030** |

---

## Import results

Transaction committed. Idempotent upserts: `ON CONFLICT (id) DO NOTHING` for new People; `ON CONFLICT (coda_row_id) DO NOTHING` for profiles; roster updates are fill-null only and never touch `class_year`.

| Action | Count |
|---|---:|
| New People inserted (`recruit-xlsx-row-*`, role=recruit) | **457** |
| Existing People updated (fill-null) | **4** |
| Recruit Profiles inserted | **461** |
| Coda pairs stored as `codaExport.mergedRows` | **12** |
| Skipped | **1** (`xlsx-row-90`) |

---

## Verification

| Check | Expected | Actual |
|---|---:|---:|
| Coda rows processed | 474 | 474 |
| New People | 457 | **457** |
| Existing People enriched | 4 | **4** |
| RecruitProfiles | 461 | **461** |
| Duplicate pairs → one identity | 12 | **12** profiles with `mergedRows` length 1 |
| Blank row skipped | 1 | no profile for `xlsx-row-90`; folded ids 120/394/92 etc. have no own profile |
| Manual-review rows | 0 | **0** |
| Coda emails on new People | 95 | **95** |
| Coda phones on new People | 105 | **105** |
| New People with `class_year` set | 0 | **0** |
| Roster `class_year` after | 2030 | **2030** all four |
| Roster `recruit_class_year` | 2026 | **2026** all four |
| Profiles missing `coda_row_id` | 0 | **0** |
| Profiles missing `coda_export` | 0 | **0** |
| Duplicate `coda_row_id` | 0 | **0** |
| Duplicate People created by migration | 0 extra | Only **Asher Negandhi** ×2 (intentional KEEP SEPARATE, 2028 vs 2027) |
| People total after | 47+457 | **504** |
| `codaExport` objects | 461 | **461** |

Contact that had been on held-out merge pairs now lives on canonical People:

| Person | Email | Phone |
|---|---|---|
| `recruit-xlsx-row-126` Noah Vinbaytel | — | 718-757-5713 |
| `recruit-xlsx-row-402` Aidan Bart | a1bartnyc@icloud.com | — |
| `recruit-xlsx-row-432` Maksim Hristov | maksibarca08@gmail.com | 224-409-4272 |

Sibling tennis/HS unions applied (examples): Sikorski HS Midtown Bannockburn; Nelson Bixby HS; Sevim Laural Springs; Balin state NV.

---

## Existing People enriched

| Person id | `classYear` kept | `recruitClassYear` | Fill-null notes |
|---|---|---|---|
| `player-peter-berns` | 2030 | 2026 | city Fort Meyers; Coda UTR not applied (Person already had UTR 10.64) |
| `player-jackson-mactaggart` | 2030 | 2026 | city Bahamas / country BS; existing UTR kept |
| `player-luke-colson` | 2030 | 2026 | existing city Louisville kept (Coda Goshen not overwritten); HS Online filled; existing UTR kept |
| `player-minato-koido` | 2030 | 2026 | city Orlando; existing UTR kept |

---

## Exceptions / follow-up

None blocking. Identity and counts match BP-043E.2.

Non-blocking notes:

1. **Fill-null vs Coda hometown/UTR on roster four** — Person already had city and/or UTR, so Coda values stayed in `codaExport` only. Correct per the fill-null rule.
2. **Colson / Koido** — still `Active Recruit` on the Recruit Profile while Person role remains player. Pipeline was not used to change role.
3. **Asher Negandhi** — two People by design (HS class 2028 vs 2027).
4. **TRN URL collisions** (Fujita/Dombrovskyi, He/Singh) — two People each; shared URL stored as-is.
5. **`xlsx-row-90`** — not attached to any Person.
6. **Local DB was missing 0014/0015** before this run; both were applied as part of preflight.

No records require a further identity decision.

---

## Final counts

| Object | Count |
|---|---:|
| Total Coda rows | **474** |
| Coda rows merged (folded) | **12** |
| Coda rows skipped | **1** |
| Resulting Recruit records | **461** |
| New People | **457** |
| Existing People enriched | **4** |
| RecruitProfiles created | **461** |
| Manual-review rows | **0** |
| Person.classYear overwritten | **0** |

---

No staging or commit in this milestone.
