# BP-043D.1 — Recruiting Duplicate & Match Review

**Read-only.** No import. No database writes.  
**Scope:** The **35** non-clean BP-043D rows only (26 possible-duplicate + 9 manual-review).  
**Source:** Coda export + `src/features/people/data.ts` (40 People).

Actions used:

| Action | Meaning |
|---|---|
| **CREATE NEW PERSON** | Import this Coda row as a new Person + Recruit Profile. |
| **MERGE WITH EXISTING PERSON** | Attach Recruit Profile to an OS roster Person. Do not create a second identity. |
| **MERGE (Coda sibling)** | Do not create a Person from this row. Fold it into the other Coda row of the pair. |
| **KEEP SEPARATE** | Do not merge with the collision partner. Each named row still becomes its own Person. |
| **SKIP** | Do not create a Person. |
| **DAVID** | Do not auto-decide. |

`codaRowId` = `xlsx-row-{sheetRow}`.

---

## Why zero email/phone matches

This is what the data shows — not a matcher bug.

| Side | Emails | Phones |
|---|---:|---:|
| Coda (474) | 95 | 105 |
| Roster `data.ts` (40) | **3** | **33** |
| Overlap | **0** | **0** |

The 3 roster emails are `macphersong95@gmail.com`, `suedmeyer.tom@gmail.com`, `wi1895@osumc.edu` (not recruits). The 4 name-collision recruits (**Berns, MacTaggart, Colson, Koido**) have **blank email and blank phone in Coda**, and **blank email and blank phone on the roster**. There is nothing to match besides first+last name (and a plausible HS 2026 → Denison 2030 class-year shift).

---

## 1. Twelve same-name Coda pairs (24 rows)

No OS Person for any of these.

### Matthew Sikorski — MERGE Coda (strong)

Same TRN player id **933987** (two URL path shapes).

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-57 | Matthew Sikorski | — | Name, 2027, Potential, TRN id 933987 | Hometown/HS empty; TRN 94; has UTR 11.02 / WTN 21.6 | 933987 | 11.02 / 21.6 | — | 2027 | **CREATE NEW PERSON** (canonical) |
| xlsx-row-120 | Matthew Sikorski | — | Same TRN id | TRN 97; Mount Prospect, IL; HS Midtown Bannockburn; no UTR/WTN | 933987 | — | Midtown Bannockburn | 2027 | **MERGE (Coda sibling)** into 57; keep hometown/HS |

### Aidan Bart — MERGE Coda (stub + complete)

Same Created on to the minute.

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-402 | Aidan Bart | — | Name, 2026, Active | — | 929992 | 11.04 / — | — | 2026 | **CREATE NEW PERSON** |
| xlsx-row-394 | Aidan Bart | — | Name, 2026, Active, same timestamp | Empty tennis/contact | — | — | — | 2026 | **MERGE (Coda sibling)** into 402 |

### Peyton Barrett, Walker Nelson, Luca Sevim — MERGE Coda (empty tennis + same place/year)

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-287 | Peyton Barrett | — | 2027, San Marino, CA | Has tennis | 948023 | 11.41 / 20.3 | — | 2027 | **CREATE NEW PERSON** |
| xlsx-row-92 | Peyton Barrett | — | Same hometown+year | No TRN/UTR/pipeline | — | — | — | 2027 | **MERGE (Coda sibling)** into 287 |
| xlsx-row-231 | Walker Nelson | — | 2028, Tulsa, OK, Potential | TRN 76; no HS | — | — | — | 2028 | **CREATE NEW PERSON** |
| xlsx-row-94 | Walker Nelson | — | Same hometown+year+pipeline | HS Bixby HS; no TRN | — | — | Bixby HS | 2028 | **MERGE (Coda sibling)** into 231; keep HS |
| xlsx-row-353 | Luca Sevim | — | 2028, Potential, Chicago IL | TRN 61 | — | — | — | 2028 | **CREATE NEW PERSON** |
| xlsx-row-93 | Luca Sevim | — | Same year+pipeline; Chicago vs Chicago, IL | HS Laural Springs; no TRN | — | — | Laural Springs | 2028 | **MERGE (Coda sibling)** into 353; keep HS |

### Conflicting TRN Rank — DAVID (12 rows)

Same name; both sides have a TRN number and they **disagree**. Do not auto-merge.

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-91 | Paxton Au | — | 2027, Manhattan Beach, CA | TRN 95 vs 121; Active vs Potential | 922250 | 11.32 / 21.2 | — | 2027 | **DAVID** |
| xlsx-row-364 | Paxton Au | — | Same hometown+year | No URL; TRN 121 | — | — | — | 2027 | **DAVID** |
| xlsx-row-99 | Mateo Rizo-Patron | — | 2027, Rye, NY, Potential | TRN 130 vs 168 | 972468 | 10.91 / 21.9 | — | 2027 | **DAVID** |
| xlsx-row-230 | Mateo Rizo-Patron | — | Same hometown+year+pipeline | TRN 168; no URL | — | — | — | 2027 | **DAVID** |
| xlsx-row-126 | Noah Vinbaytel | — | Potential; FL | TRN 100 vs 101 | 935523 | 11 / 23 | Dwight Global | 2027 | **DAVID** |
| xlsx-row-191 | Noah Vinbaytel | — | Name, Potential, FL | Year blank; TRN 101; no URL | — | — | — | — | **DAVID** |
| xlsx-row-109 | Evan Chu | — | Potential; NY | TRN 167 vs 153 | 1015135 | 10.69 / 24.1 | — | 2027 | **DAVID** |
| xlsx-row-215 | Evan Chu | — | Name, Potential, NY | Year blank; TRN 153 | — | — | — | — | **DAVID** |
| xlsx-row-110 | Ivan Urbanovich | — | FL | TRN 222 vs 193; pipeline blank vs Potential | 935912 | 10.13 / 24.7 | — | 2027 | **DAVID** |
| xlsx-row-182 | Ivan Urbanovich | — | Name, FL | Year blank; TRN 193 | — | — | — | — | **DAVID** |
| xlsx-row-19 | Balin Gupta | — | Potential | TRN 178 vs 188 | 969711 | 10.28 / 23.4 | — | 2027 | **DAVID** |
| xlsx-row-177 | Balin Gupta | — | Name, Potential | Hometown NV only; TRN 188 | — | — | — | — | **DAVID** |

### Asher Negandhi — KEEP SEPARATE

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-96 | Asher Negandhi | — | Roswell, GA, Potential | **Class 2028**; HS GA Academy; no TRN | — | — | GA Academy | **2028** | **KEEP SEPARATE** (CREATE if imported) |
| xlsx-row-319 | Asher Negandhi | — | Same city+pipeline | **Class 2027**; TRN 258 | — | — | — | **2027** | **KEEP SEPARATE** (CREATE if imported) |

---

## 2. Maxim / Maksim Hristov — shared TRN id 955372

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-432 | Maksim Hristov | — | Class 2026, Active, TRN id 955372 | — | **955372** | 11.24 / — | — | 2026 | **CREATE NEW PERSON** (canonical; has email/phone) |
| xlsx-row-400 | Maxim Hristov | — | Same TRN id, year, pipeline | Spelling; TRN 67 vs 74; no contact | **955372** | — | — | 2026 | **MERGE (Coda sibling)** into 432 |

Not on the OS roster.

---

## 3. Four TRN-URL collision rows (different people)

Same `id=` on TRN URL, **different names, hometowns, and ratings**. Treat as copied URLs, not one person.

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-388 | Eiji Fujita | — | Shared URL id with Vlad; both 2026 Elsewhere; both TRN Rank **142** | Ontario vs Greenwich; UTR 10.65 vs 10.88 | 1048343 | 10.65 / — | — | 2026 | **KEEP SEPARATE** → CREATE |
| xlsx-row-399 | Volodymyr (Vlad) Dombrovskyi | — | Same URL id | Has email/phone; CT | 1048343 | 10.88 / — | — | 2026 | **KEEP SEPARATE** → CREATE |
| xlsx-row-427 | Samuel He | — | Shared URL id with Singh; both 2026 Elsewhere | SF vs Bellevue; TRN 92 vs 158; UTR 11.18 vs 10.81 | 944605 | 11.18 / — | — | 2026 | **KEEP SEPARATE** → CREATE |
| xlsx-row-463 | Deepinder Singh | — | Same URL id | Phone on file; TRN 158 | 944605 | 10.81 / — | — | 2026 | **KEEP SEPARATE** → CREATE |

Fujita/Vlad sharing **both** URL id and TRN Rank 142 is suspicious (possible one copied rank+URL). Still **KEEP SEPARATE** until a TRN page check. Do not merge.

---

## 4. Four roster name-only matches

No email/phone on **either** side. Coda HS class **2026** and roster Denison **2030** are different fields (BP-043E), not a conflict.

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-472 | Peter Berns | `player-peter-berns` | Exact name; Committed-Denison | No email/phone; Coda hometown Fort Meyers, FL; roster city blank | 934461 | 10.55 / — | — | HS 2026 + Denison 2030 | **DAVID** (lean **MERGE WITH EXISTING PERSON**; keep Person.classYear 2030; store 2026 on recruitClassYear) |
| xlsx-row-455 | Jackson MacTaggart | `player-jackson-mactaggart` | Exact name; Committed-Denison | No email/phone; Coda hometown Bahamas | 887218 | 10.73 / — | — | HS 2026 + Denison 2030 | **DAVID** (lean **MERGE WITH EXISTING PERSON**; same class-year rule) |
| xlsx-row-410 | Luke Colson | `player-luke-colson` | Exact name | Coda still **Active Recruit**; HS Online; Goshen, KY; roster has no phone either | 899496 | 10.50 / — | Online | HS 2026 + Denison 2030 | **DAVID** (lean merge, but pipeline still Active; same class-year rule) |
| xlsx-row-416 | Minato Koido | `player-minato-koido` | Exact name | Coda still **Active Recruit**; Orlando, FL | 971110 | 11.12 / — | — | HS 2026 + Denison 2030 | **DAVID** (lean merge, but pipeline still Active; same class-year rule) |

---

## 5. Blank / stub row

| Coda row | Name | OS Person | Match | Conflict | TRN id | UTR / WTN | HS | Class | Action |
|---|---|---|---|---|---|---|---|---|---|
| xlsx-row-90 | *(blank)* | — | None | Only `Created on` 7/10/2026 and button/`International=0` artifacts | — | — | — | — | **SKIP** — do not create a Person |

---

## Counts (35 rows)

| Bucket | Rows | Who |
|---:|---|---|
| **Confidently safe to CREATE** | **6** | Sikorski-57, Bart-402, Maksim-432, Peyton-287, Walker-231, Luca-353 |
| **Confidently safe to MERGE** | **6** | Coda siblings: 120, 394, 400, 92, 94, 93. **Zero** confident merges to OS roster. |
| **KEEP SEPARATE** | **6** | Fujita, Vlad, He, Singh, Asher-96, Asher-319 (each still a Person if imported) |
| **David’s decision** | **16** | 12 conflicting-TRN same-name rows + 4 roster name-only |
| **SKIP** | **1** | xlsx-row-90 stub |

6+6+6+16+1 = **35**.

KEEP SEPARATE still yields **6 additional People** if imported (not merged with the collision partner). Combined new identities from the “safe CREATE” + “keep separate” rows = **12**, plus whatever David approves from the 16.

---

## Surprising findings

1. **Zero email/phone hits is correct.** The four players who look like roster overlaps have no contact fields in Coda *or* on the roster.  
2. **Maxim/Maksim is a real extra duplicate** (shared TRN id 955372), not one of the original 12 names.  
3. **Two TRN URLs are reused across different people** — matcher cannot trust URL uniqueness. Fujita/Vlad also share TRN Rank 142.  
4. **Aidan Bart’s two rows share an identical Created on timestamp** — classic split insert, not two people.  
5. **Berns and MacTaggart are Committed-Denison in Coda and already on the player roster;** Colson and Koido are on the roster but still Active Recruit in Coda.  
6. Roster snapshot emails are almost unused (3), so a live `production_people` re-match is still worth doing before import — it will not fix these four, who have no emails.

---

No database writes. No import.
