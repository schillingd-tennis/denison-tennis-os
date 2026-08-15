# BP-043D — Coda Recruiting Migration Dry Run

**Mode:** Read-only. Zero database writes.  
**Export:** `Dropbox/@Inbox/zArchive/  Delete/Recruits.xlxs.xlsx` (sheet `Sheet 1 - Recruits`).  
**Roster compared:** `src/features/people/data.ts` — **40** People (generated 2026-08-05). Production `production_people` was **not** opened.  
**Target schema:** BP-043C Person tennis/school columns + `recruit_profiles`.

Provisional `codaRowId`: `xlsx-row-{ExcelSheetRow}`. The workbook contains **no native Coda row UUID**.

---

## 1. Executive Summary

All **474** Coda rows and **67** columns were analyzed. Every column is assigned to Person, Recruit Profile, a future engine, `codaExport`-only, or explicit non-import.

Matching used email, phone, first+last name, class year, hometown, high school, UTR/WTN, and TRN URL player id. **Name alone never produces an “Existing Person match.”**

| Result | Count |
|---:|---|
| Confirmed existing Person (email or phone) | **0** |
| Name-only roster collisions (manual review) | **4** |
| Known same-name Coda pairs | **12 names / 24 rows** |
| Additional duplicate candidates (spelling / shared TRN id) | **1 pair + 2 URL collisions** |
| Rows that can be new People after review | **439** (see disposition) |
| Lossless `codaExport` | **474 / 474** |

**Do not import yet.** Decisions in §12 must be made first.

---

## 2. Row Disposition Summary

Each row has **one** primary class (priority: existing match → manual review → possible duplicate → new Person).

| # | Class | Rows | Rule |
|---|---|---:|---|
| 1 | Existing Person match | **0** | Email or 10-digit phone match to roster |
| 2 | New Person | **439** | Named row, no roster identity match, not in a duplicate cluster |
| 3 | Possible duplicate | **26** | 12 same-name pairs (24) + Maxim/Maksim Hristov (2) |
| 4 | Manual review | **9** | 4 roster name-only hits + 1 blank stub + 4 rows in two **different-name** TRN-URL collisions |
| | **Total** | **474** | |

Unique Coda Player Names: **461** + 1 blank. If all 13 mergeable pairs collapsed, unique identities ≈ **461 − 12 extras − 1 Hristov extra** = **448** named, still subject to the 4 roster reviews and 2 bad-URL pairs.

---

## 3. Existing Person Matches

**Confirmed matches: none.**

Roster has 3 emails and many phones; Coda has 95 emails and 105 phones. **Intersection is empty.**

**Name-only collisions (classified Manual review, not matches):**

Coda Class Year is **HS recruiting class**. Roster `classYear` is **Denison college graduation**. 2026 vs 2030 is complementary (typical 4-year lag), not a field conflict (BP-043E).

| Coda row | Coda name | Coda HS class / pipeline | Roster id | Denison class | Other overlap |
|---|---|---|---|---|---|
| xlsx-row (Peter Berns) | Peter Berns | 2026 / Committed - Denison | `player-peter-berns` | 2030 | Name only. Preserve 2030; store 2026 on `recruitClassYear`. |
| Jackson MacTaggart | Jackson MacTaggart | 2026 / Committed - Denison | `player-jackson-mactaggart` | 2030 | Name only. Same rule. |
| Luke Colson | Luke Colson | 2026 / Active Recruit | `player-luke-colson` | 2030 | Name only. Coda still Active Recruit. |
| Minato Koido | Minato Koido | 2026 / Active Recruit | `player-minato-koido` | 2030 | Name only. Same rule. |

**Do not auto-link on name.** Do not write Coda Class Year to `Person.classYear`.

Committed-Denison **not** on roster: Kaito Tokukura, Yusaku Harashima → New Person + outcome `committed_denison` until a later roster decision.

---

## 4. New Person Candidates

**439** rows: have a Player Name, do not match roster email/phone, are not in the 12 same-name pairs, are not Maxim/Maksim Hristov, and are not in the Fujita/Dombrovskyi or He/Singh URL collisions.

These would create Person `role=recruit` + Recruit Profile. `createdAt` may be taken from Coda “Created on” for **new** rows only.

Not counted here: blank stub (`xlsx-row-90`), the 4 roster-name reviews, and all duplicate-cluster rows.

---

## 5. Duplicate / Merge Candidates

### 5a. Known 12 same-name pairs (24 rows) — Possible duplicate

| Name | Rows | Matching | Conflicting | Same person? | Action |
|---|---|---|---|---|---|
| Matthew Sikorski | 57, 120 | Class 2027, Potential; TRN **id=933987** (two URL shapes) | Rank 94 vs 97; hometown/HS/UTR/WTN on one side | **Yes** | **Merge** (strong) |
| Aidan Bart | 394, 402 | Class 2026, Active, identical Created on | 394 empty; 402 has TRN/UTR/email/hometown | Likely stub+complete | **Merge** if coach confirms |
| Paxton Au | 91, 364 | 2027, Manhattan Beach, CA | TRN 95 vs 121; Active vs Potential | Likely | Manual review |
| Peyton Barrett | 92, 287 | 2027, San Marino, CA | 92 empty tennis | Likely stub | Manual review |
| Walker Nelson | 94, 231 | 2028, Tulsa, OK, Potential | HS vs TRN 76 | Likely | Manual review |
| Luca Sevim | 93, 353 | 2028, Chicago / Chicago, IL | HS vs TRN 61 | Likely | Manual review |
| Mateo Rizo-Patron | 99, 230 | 2027, Rye, NY | TRN 130 vs 168 | Likely | Manual review |
| Noah Vinbaytel | 126, 191 | Potential; FL vs Sunny Isles | TRN 100 vs 101 | Likely | Manual review |
| Evan Chu | 109, 215 | Potential; NY vs New York, NY | TRN 167 vs 153 | Uncertain | Manual review |
| Ivan Urbanovich | 110, 182 | FL vs Winter Garden | TRN 222 vs 193 | Uncertain | Manual review |
| Balin Gupta | 19, 177 | Potential | TRN 178 vs 188 | Uncertain | Manual review |
| Asher Negandhi | 96, 319 | Roswell, GA, Potential | **Class 2028 vs 2027** | Maybe two people | **Do not merge** without coach |

No duplicate **emails** or **phones** across different Coda names.

### 5b. Additional candidates (not in the original 12)

| Rows | Names | Signal | Action |
|---|---|---|---|
| 400, 432 | Maxim Hristov / Maksim Hristov | Same TRN id **955372**, class 2026, Active Recruit; TRN 67 vs 74 | **Possible duplicate** (spelling). Review then merge to one Person. |
| 388, 399 | Eiji Fujita / Volodymyr (Vlad) Dombrovskyi | Same TRN id **1048343** and TRN Rank 142; **different names, hometowns, UTR** | **Manual review** — likely a copied URL, not one person. |
| 427, 463 | Samuel He / Deepinder Singh | Same TRN id **944605**; different names, hometowns, ranks (92 vs 158) | **Manual review** — likely a copied URL. |

---

## 6. Manual Review Required

**9 rows in primary class 4**, plus coach review of every duplicate pair before merge.

| Item | Rows | Why |
|---|---|---|
| Roster name-only | Peter Berns, Jackson MacTaggart, Luke Colson, Minato Koido | Could already be players; class year meaning differs |
| Blank stub | xlsx-row-90 | No name; only button/system fields. **Do not create Person.** |
| Shared TRN URL, different people | Fujita, Dombrovskyi, Samuel He, Deepinder Singh | URL cannot identify the person |
| Duplicate pairs (class 3) | 26 rows | Merge vs keep separate (see §5) |
| Enzo Badotti Cariani | UTR `10.37 (10.95 doubles)` | Malformed rating |
| Ricardo Espalliat | Pipeline = Transfer | Type vs pipeline |
| Drew Gilbert | Closed + Medium Interest | Outcome mapping |
| Tokukura / Harashima | Committed-Denison, not on roster | New Person vs missing roster |
| Asher Negandhi | 2027 vs 2028 | Do not merge on name+city |
| Interest overloaded | 33 No Contact; 15 Committed elsewhere | Keep raw; do not silently convert |

---

## 7. Person Field Mapping

Do not duplicate these onto Recruit Profile. Do not import International.

| Coda | Person field | Population | Dry-run rule |
|---|---|---:|---|
| Player Name | (split only) | 473 | Nicknames in parentheses → `preferredName` (8 names). |
| First Name | `firstName` | 473 | |
| Last Name | `lastName` | 473 | |
| Email | `personalEmail` | 95 | No roster overlap. |
| Phone | `cellPhone` | 105 | Store display phone. Do not also store Phone E164. |
| Hometown | `city`/`state`/`country` | 411 | Parse `City, ST` (318). State-only 63. Country-in-text 20. Unparsed 6 (`Chicago`; `Dorado, PR`×2; IMG Academy×2; `Limasoll, Cyprus`). Full-state-name US cities 4. |
| UTR | `utr` | 252 numeric + 1 dirty | Dirty → 10.37 + raw in `codaExport`. |
| WTN | `wtn` | 185 | |
| TRN Rank | `trnRank` | 430 | Raw TRN. **Not** calculated TR Rank. Blank 44. Never -1. |
| TR Star Rating | `trnStarRating` | 116 | ⭐⭐⭐/⭐⭐⭐⭐/⭐⭐⭐⭐⭐ → 3/4/5. All map. |
| TRN URL | `trnUrl` | 274 | Keep as-is; two path shapes exist. |
| UTR URL | `utrUrl` | 243 | |
| Matches Played | `utrMatchesPlayed` | 179 | `0` is real zero (1 row). Blank is null, not 0. |
| Video URL | `videoUrl` | **0** | Always null. |
| High School | `highSchool` | 43 | Person only. |
| Created on | `createdAt` | 474 | New People only. |
| Phone E164 | (derive later) | 105 | Not a Person column. |
| International | **omit** | 474 × `0` | Do not store false. |

---

## 8. RecruitProfile Field Mapping

Normalized lookup **plus** raw Coda strings where the source is overloaded.

| Coda | RecruitProfile | Mapping |
|---|---|---|
| Class Year | `recruitClassYear` | HS graduation / recruiting class. 425 populated. **Never** map to `Person.classYear`. Existing roster matches: keep Denison 2030; store Coda 2026 here. New recruits: this field only; leave Person `classYear` unset. |
| (derived) | `recruitTypeId` | Default `high_school`. Pipeline Transfer (1) → `transfer`. Do **not** set `international` from Coda International. ~20 non-US hometowns = later coach choice. |
| Pipeline Stage | `pipelineStageId` + `codaPipelineStage` | Potential 327 → `potential`; Active 80 → `active`; Committed-Elsewhere 46 → `committed`; Committed-Denison 4 → `committed`; Closed 4 → `closed`; blank 12 → `unknown`; Transfer 1 → raw `Transfer`, normalized pipeline `unknown`. |
| Interest | `interestId` + `codaInterest` | High 42 → `high`; Medium 30 → `medium`; Little or No 13 → `low`; blank → `unknown`. **No Contact 33** → interest `unknown`, raw preserved. **Committed elsewhere 15** → interest `unknown`, raw preserved. |
| Outcome | `outcomeId` | Elsewhere 46 → `committed_elsewhere`; Denison 4 → `committed_denison`. Closed + Little/No Interest (2) → `no_longer_recruiting`. Closed + Medium or blank (2) → outcome **null**, raw pipeline Closed. |
| Priority | `priorityId` | 1-Elite 122, 2-Significant 20, 3-Potential 44, 4-Probably Not 15, blank 273. Not Tier. |
| Getability | `getabilityId` | 43 mapped, 431 blank. |
| Focus | `focus` | 3 × true; else **null**. |
| GPA | `gpa` (text) | 11 rows including `4.7 w`. |
| SAT | `sat` | 4. |
| ACT | `act` | 0 filled. |
| Academic Interests | `academicInterests` | 53. |
| Preread | `prereadStatusId` | Green 7, Yellow 4. |
| Preread $ | `prereadScholarshipAmount` | 20000 (5), 25000 (1), **0** (1 — store zero). |
| Schools of Interest | `schoolsOfInterest` | 63. |
| School Chosen | `schoolChosen` | 43. Denison commits blank. |
| Notes / Game Notes / Key Pitch | `notes` / `gameNotes` / `keyPitchAngle` | 53 / 46 / 5. Not Person.notes. |
| — | `codaRowId` | `xlsx-row-*` until real Coda ids exist. |
| — | `codaExport` | Full 67-key object per row. **474/474.** |

---

## 9. Unmapped / Ambiguous Fields

**Unmapped columns: none.** All 67 are assigned.

| Bucket | Columns |
|---|---|
| Person | Player Name, First/Last, Email, Phone, Hometown, UTR, WTN, TRN Rank, TR Star Rating, TRN URL, UTR URL, Matches Played, Video URL, High School, Created on |
| Recruit Profile | Class Year → `recruitClassYear`, Pipeline, Interest, Priority, Getability, Focus, GPA, SAT, ACT, Academic Interests, Preread, Preread $, Schools of Interest, School Chosen, Notes, Game Notes, Key Pitch Angle |
| Communication later (`codaExport` until then) | Outreach, Contact History, Last/Days Contact, Contact Flag, Last/Days Text, Draft Text, Waiting On Me, Awaiting Reply Since/Text/Days, Call Log Entry, Phone E164 |
| Scouting later (`codaExport` until then) | Tournaments Scouted, Tournaments Attended / Upcoming |
| Analytics later (**do not persist**) | WTN Rank, TR Rank, UTR Rank, Weighted Score, Composite Rank, WTN/TR/UTR Z, Composite Z, Reliability, Adjusted TR Rank, Reliability Score, Tier |
| Export artifacts (`codaExport` only) | Log Interaction, Send Text, Send WhatsApp, Text / WhatsApp Sent |
| Explicit non-import | International |

**Ambiguous (preserve raw; do not silent-convert):**

| Value | n | Issue |
|---|---:|---|
| Interest = No Contact | 33 | Contact state ≠ interest |
| Interest = Committed elsewhere | 15 | Outcome ≠ interest (31 other Elsewhere rows have blank Interest) |
| Pipeline = Transfer | 1 | Recruit type ≠ pipeline |
| Pipeline = Closed + Medium Interest | 1 | Outcome rule is Interest-dependent |
| Pipeline blank | 12 | Unknown vs missing |
| Priority “1 - Elite” vs Tier “1 - Elite” | — | Different fields |
| HS 2026 vs Person 2030 | 4 | **Not a conflict.** HS recruiting class vs Denison college year (BP-043E). |
| Shared TRN URL, different names | 2 pairs | Copied URL vs same person |
| Hometown `Dorado, PR` | 2 | Territory parse |

---

## 10. Data Quality Issues

1. Excel has no Coda row UUID — re-import identity is unstable.  
2. 12 same-name splits (often 5/17 or 5/29 stub + later rated row).  
3. Maxim / Maksim Hristov extra spelling duplicate.  
4. Two TRN URLs reused across **different** people (likely copy-paste).  
5. Four roster names still on the recruit list.  
6. Two Denison commits absent from `data.ts`.  
7. Overloaded Interest; useless International flag.  
8. Dirty UTR; unparsed hometowns; GPA as text; TRN URL path variants.  
9. Button columns `model`/`system`.  
10. Roster snapshot is email-poor (3), so matching is weaker than Coda’s 95 emails suggest. Live DB was not queried.

**Sentinels / blanks / zeros / malformed**

| Token | Where | Import representation |
|---|---|---|
| `-1` | Calculated TR Rank 129, UTR Rank 31 | **Do not store** on Person. Analytics later. |
| `90.48` | Adjusted TR Rank (~251) | **Do not store.** |
| `0` | International ×474 | **Do not import.** |
| `0` | Matches Played (1), Preread $ (1) | Store numeric **0**. |
| blank | Many optional fields | SQL NULL. Blank matches ≠ 0. |
| blank name | xlsx-row-90 | Skip Person. |
| `10.37 (10.95 doubles)` | UTR | Parse 10.37; keep raw in export. |
| `4.7 w` | GPA | Text on profile. |
| `model` / `system` | Buttons | Export only. |

---

## 11. Migration Risks

1. Creating a second Person for Berns / MacTaggart / Colson / Koido.  
2. Writing Coda Class Year onto `Person.classYear` (use `recruitClassYear`; preserve Denison 2030).  
3. Importing both halves of a duplicate pair as two People.  
4. Merging Asher Negandhi 2027/2028 or URL-collision pairs incorrectly.  
5. Persisting calculated `-1` / `90.48` as tennis facts.  
6. Importing International=0 as `false`.  
7. Dropping Interest/Pipeline overload if `codaInterest` / `codaPipelineStage` / `codaExport` are skipped.  
8. Losing communication/scouting text if it only exists in Coda and is not in `codaExport`.  
9. Unstable `xlsx-row-*` ids on a re-export.  
10. Roster in `data.ts` may differ from hosted `production_people`.

---

## 12. Recommended Decisions Before Import

1. Confirm the 4 roster name collisions: attach Recruit Profile to existing Person vs leave as new.  
2. Merge policy: auto-merge only **Matthew Sikorski** (same TRN id) unless coach expands the list (Aidan Bart, Maxim/Maksim).  
3. Treat Fujita/Dombrovskyi and He/Singh as **URL errors**, not merges.  
4. Skip blank stub.  
5. Keep `codaExport` = full 67 fields; never drop unknown columns.  
6. Store overloaded Interest/Pipeline as raw strings; use the normalized lookup mapping in §8.  
7. Do not import International; do not store analytics columns.  
7b. Coda Class Year → `recruitClassYear` only (BP-043E).  
8. Obtain real Coda row ids if a second export is possible.  
9. Re-run matching against **live** `production_people` before any write (this dry run used `data.ts` only).  
10. Decide Tokukura / Harashima: recruit-with-committed-outcome vs already players missing from the snapshot.

---

## Validation

| Check | Result |
|---|---|
| 474 rows | Yes |
| 67 columns assigned | Yes |
| `codaExport` complete | 474/474 |
| Name-only never auto-matched | Yes |
| 12 known duplicate names | Yes, plus extra candidates in §5b |
| Existing People modified | **No** |
| Database writes | **None** |

Analysis script (local, not production): `tmp/bp043d_dry_run.py`.
