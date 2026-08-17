# BP-043D.5 — Ambiguous Records (David’s Decision)

**Read-only.** No import. No database writes. No staging or commit.  
**Source review:** [`BP-043D1_RECRUITING_MATCH_REVIEW.md`](./BP-043D1_RECRUITING_MATCH_REVIEW.md) (the file named `BP-043D_RECRUITING_MATCH_REVIEW.md` does not exist).  
**Class years (BP-043E):** Coda Class Year = HS recruiting class (`recruitClassYear`). Person `classYear` = Denison college graduation. 2026 vs 2030 is not a conflict.  
**Coda:** `Recruits.xlxs.xlsx` sheet `Sheet 1 - Recruits`. Row IDs are `xlsx-row-{Excel sheet row}`.  
**Roster:** `src/features/people/data.ts`.

These are the **16** rows classified as David’s decision in BP-043D.1:

| # | Coda row | Name | Compared to |
|---|---|---|---|
| 1–2 | xlsx-row-91, 364 | Paxton Au | Conflicting Coda row |
| 3–4 | xlsx-row-99, 230 | Mateo Rizo-Patron | Conflicting Coda row |
| 5–6 | xlsx-row-126, 191 | Noah Vinbaytel | Conflicting Coda row |
| 7–8 | xlsx-row-109, 215 | Evan Chu | Conflicting Coda row |
| 9–10 | xlsx-row-110, 182 | Ivan Urbanovich | Conflicting Coda row |
| 11–12 | xlsx-row-19, 177 | Balin Gupta | Conflicting Coda row |
| 13 | xlsx-row-472 | Peter Berns | OS Person `player-peter-berns` |
| 14 | xlsx-row-455 | Jackson MacTaggart | OS Person `player-jackson-mactaggart` |
| 15 | xlsx-row-410 | Luke Colson | OS Person `player-luke-colson` |
| 16 | xlsx-row-416 | Minato Koido | OS Person `player-minato-koido` |

Blank Coda cells are shown as `—`. Coda has no Outcome column; Outcome below is the value implied by Pipeline Stage in BP-043C (`Committed - Denison` → `committed_denison`; otherwise `—`).

Recommendations below are **review notes only**. Nothing was applied.

---

## A. Same-name Coda pairs with conflicting TRN Rank (12 rows)

### 1–2. Paxton Au

**Coda record**

| Field | Value |
|---|---|
| Name | Paxton Au |
| Coda Row ID | `xlsx-row-91` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2027 |
| Hometown | Manhattan Beach, CA |
| TRN ID / URL | `922250` / https://www.tennisrecruiting.net/player.asp?id=922250 |
| UTR | 11.32 (https://app.utrsports.net/profiles/3121148) |
| WTN | 21.2 |
| Pipeline | Active Recruit |
| Interest | Medium Interest |
| Outcome | — |

**Conflicting Coda record**

| Field | Value |
|---|---|
| Name | Paxton Au |
| Coda Row ID | `xlsx-row-364` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2027 |
| Hometown | Manhattan Beach, CA |
| TRN ID / URL | — / — |
| UTR | — |
| WTN | — |
| *(also)* TRN Rank | **121** (row 91 is **95**) |
| *(also)* Pipeline | Potential |
| *(also)* Priority / Getability | 1 - Elite / 3 - Have a Chance |
| *(also)* Created on | 5/17/2026, 5:24 AM (row 91: 7/6/2026, 9:36 AM) |

**RECOMMENDATION:** MERGE (keep `xlsx-row-91`; do not create a second Person; do not treat TRN Rank 121 as a second identity)

**CONFIDENCE:** Medium

**REASON:** Same name, hometown, and class year. Row 364 is a 5/17 bulk stub with no TRN/UTR/WTN URL. The only hard conflict is TRN Rank 95 vs 121 plus Active vs Potential — consistent with a later enriched row, not proof of two people.

---

### 3–4. Mateo Rizo-Patron

**Coda record**

| Field | Value |
|---|---|
| Name | Mateo Rizo-Patron |
| Coda Row ID | `xlsx-row-99` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2027 |
| Hometown | Rye, NY |
| TRN ID / URL | `972468` / https://tennisrecruiting.net/player/overview.asp?id=972468 |
| UTR | 10.91 (https://app.utrsports.net/profiles/5161745) |
| WTN | 21.9 |
| Pipeline | Potential |
| Interest | — |
| Outcome | — |

**Conflicting Coda record**

| Field | Value |
|---|---|
| Name | Mateo Rizo-Patron |
| Coda Row ID | `xlsx-row-230` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2027 |
| Hometown | Rye, NY |
| TRN ID / URL | — / — |
| UTR | — |
| WTN | — |
| *(also)* TRN Rank | **168** (row 99 is **130**) |
| *(also)* Pipeline | Potential |
| *(also)* Created on | 5/17/2026, 5:26 AM (row 99: 6/26/2026, 4:34 PM) |

**RECOMMENDATION:** MERGE (keep `xlsx-row-99`)

**CONFIDENCE:** Medium

**REASON:** Identical name, hometown, class year, and pipeline. Row 230 has no tennis URLs and is a 5/17 bulk row. TRN Rank 130 vs 168 is a real number conflict with no second TRN ID to prove two players.

---

### 5–6. Noah Vinbaytel

**Coda record**

| Field | Value |
|---|---|
| Name | Noah Vinbaytel |
| Coda Row ID | `xlsx-row-126` |
| Email | — |
| Phone | 718-757-5713 |
| High School | Dwight Global |
| Class Year | 2027 |
| Hometown | Sunny Isles Beach, FL |
| TRN ID / URL | `935523` / https://www.tennisrecruiting.net/player.asp?id=935523 |
| UTR | 11 (https://app.utrsports.net/profiles/3161476) |
| WTN | 23 |
| Pipeline | Potential |
| Interest | Little or No Interest |
| Outcome | — |

**Conflicting Coda record**

| Field | Value |
|---|---|
| Name | Noah Vinbaytel |
| Coda Row ID | `xlsx-row-191` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | — |
| Hometown | FL |
| TRN ID / URL | — / — |
| UTR | — |
| WTN | — |
| *(also)* TRN Rank | **101** (row 126 is **100**) |
| *(also)* Pipeline | Potential |
| *(also)* Priority | 1 - Elite |
| *(also)* Created on | 5/29/2026, 3:41 PM (row 126: 6/5/2026, 4:46 AM) |

**RECOMMENDATION:** MERGE (keep `xlsx-row-126`)

**CONFIDENCE:** High

**REASON:** Same uncommon name; FL vs Sunny Isles Beach, FL; TRN Rank 100 vs 101. Row 191 is a 5/29 state-only stub with no URL, year, or contact. Nothing in 191 contradicts 126 except a one-point TRN Rank.

---

### 7–8. Evan Chu

**Coda record**

| Field | Value |
|---|---|
| Name | Evan Chu |
| Coda Row ID | `xlsx-row-109` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2027 |
| Hometown | New York, NY |
| TRN ID / URL | `1015135` / https://www.tennisrecruiting.net/player.asp?id=1015135 |
| UTR | 10.69 (https://app.utrsports.net/profiles/977655) |
| WTN | 24.1 |
| Pipeline | Potential |
| Interest | Medium Interest |
| Outcome | — |

**Conflicting Coda record**

| Field | Value |
|---|---|
| Name | Evan Chu |
| Coda Row ID | `xlsx-row-215` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | — |
| Hometown | NY |
| TRN ID / URL | — / — |
| UTR | — |
| WTN | — |
| *(also)* TRN Rank | **153** (row 109 is **167**) |
| *(also)* Pipeline | Potential |
| *(also)* Priority | 1 - Elite |
| *(also)* Created on | 5/29/2026, 3:41 PM (row 109: 6/19/2026, 3:08 PM) |

**RECOMMENDATION:** MERGE (keep `xlsx-row-109`)

**CONFIDENCE:** Medium

**REASON:** Same name; NY vs New York, NY; 215 is the same 5/29 stub pattern as the other state-only duplicates. TRN Rank 167 vs 153 has no second TRN ID. Name is more common than Vinbaytel, so this is weaker than Noah.

---

### 9–10. Ivan Urbanovich

**Coda record**

| Field | Value |
|---|---|
| Name | Ivan Urbanovich |
| Coda Row ID | `xlsx-row-110` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2027 |
| Hometown | Winter Garden, FL |
| TRN ID / URL | `935912` / https://www.tennisrecruiting.net/player.asp?id=935912 |
| UTR | 10.13 (https://app.utrsports.net/profiles/881057) |
| WTN | 24.7 |
| Pipeline | — |
| Interest | — |
| Outcome | — |

**Conflicting Coda record**

| Field | Value |
|---|---|
| Name | Ivan Urbanovich |
| Coda Row ID | `xlsx-row-182` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | — |
| Hometown | FL |
| TRN ID / URL | — / — |
| UTR | — |
| WTN | — |
| *(also)* TRN Rank | **193** (row 110 is **222**) |
| *(also)* Pipeline | Potential |
| *(also)* Priority | 1 - Elite |
| *(also)* Created on | 5/29/2026, 3:41 PM (row 110: 6/19/2026, 3:07 PM) |

**RECOMMENDATION:** MERGE (keep `xlsx-row-110`)

**CONFIDENCE:** Medium

**REASON:** Same uncommon name; FL vs Winter Garden, FL; 182 is a 5/29 stub with no URL. TRN Rank 222 vs 193 is the largest gap in this set, so it is still possible these are two players, but there is still only one TRN ID.

---

### 11–12. Balin Gupta

**Coda record**

| Field | Value |
|---|---|
| Name | Balin Gupta |
| Coda Row ID | `xlsx-row-19` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2027 |
| Hometown | — |
| TRN ID / URL | `969711` / https://www.tennisrecruiting.net/player.asp?id=969711 |
| UTR | 10.28 (https://app.utrsports.net/profiles/2929778) |
| WTN | 23.4 |
| Pipeline | Potential |
| Interest | — |
| Outcome | — |

**Conflicting Coda record**

| Field | Value |
|---|---|
| Name | Balin Gupta |
| Coda Row ID | `xlsx-row-177` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | — |
| Hometown | NV |
| TRN ID / URL | — / — |
| UTR | — |
| WTN | — |
| *(also)* TRN Rank | **188** (row 19 is **178**) |
| *(also)* Pipeline | Potential |
| *(also)* Priority | 1 - Elite |
| *(also)* Created on | 5/29/2026, 3:41 PM (row 19: 7/24/2026, 3:07 AM) |

**RECOMMENDATION:** MERGE (keep `xlsx-row-19`; carry hometown NV from 177 if you accept they are the same)

**CONFIDENCE:** Low

**REASON:** Same name and pipeline, and 177 is the same 5/29 stub pattern, but the richer row has **no hometown** while the stub is NV-only. TRN Rank 178 vs 188 with no second URL. Geography cannot be confirmed from these two rows alone.

---

## B. Roster name-only matches (4 rows)

OS People have **no** email, phone, high school, hometown, TRN, UTR, or WTN in `data.ts`. Class year on the roster is Denison **2030**.

### 13. Peter Berns

**Coda record**

| Field | Value |
|---|---|
| Name | Peter Berns |
| Coda Row ID | `xlsx-row-472` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2026 |
| Hometown | Fort Meyers, FL |
| TRN ID / URL | `934461` / https://www.tennisrecruiting.net/player/coach.asp?id=934461 |
| UTR | 10.55 (https://app.utrsports.net/profiles/3073850) |
| WTN | — |
| Pipeline | Committed - Denison |
| Interest | — |
| Outcome | committed_denison (from pipeline) |

**Existing Person**

| Field | Value |
|---|---|
| Name | Peter Berns |
| Person ID | `player-peter-berns` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2030 |
| Hometown | — |
| TRN ID / URL | — |
| UTR | — |
| WTN | — |
| *(also)* Role / status | player / current / active |

**RECOMMENDATION:** MERGE (attach Recruit Profile to `player-peter-berns`; keep `Person.classYear` 2030; store Coda 2026 on `recruitClassYear`)

**CONFIDENCE:** High

**REASON:** Exact name, Coda pipeline is Committed - Denison, and a current 2030 player already exists. HS 2026 and Denison 2030 are different fields, not a conflict. No email/phone on either side, so this is still name + outcome, not a contact match.

---

### 14. Jackson MacTaggart

**Coda record**

| Field | Value |
|---|---|
| Name | Jackson MacTaggart |
| Coda Row ID | `xlsx-row-455` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2026 |
| Hometown | Bahamas |
| TRN ID / URL | `887218` / https://www.tennisrecruiting.net/player/coach.asp?id=887218 |
| UTR | 10.73 (https://app.utrsports.net/profiles/4990510) |
| WTN | — |
| Pipeline | Committed - Denison |
| Interest | — |
| Outcome | committed_denison (from pipeline) |

**Existing Person**

| Field | Value |
|---|---|
| Name | Jackson MacTaggart |
| Person ID | `player-jackson-mactaggart` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2030 |
| Hometown | — |
| TRN ID / URL | — |
| UTR | — |
| WTN | — |
| *(also)* Role / status | player / current / active |

**RECOMMENDATION:** MERGE (attach Recruit Profile to `player-jackson-mactaggart`; keep `Person.classYear` 2030; store Coda 2026 on `recruitClassYear`)

**CONFIDENCE:** High

**REASON:** Exact uncommon name, Committed - Denison in Coda, current 2030 player on the roster. Hometown Bahamas exists only on the Coda side; the Person record has no geography to confirm or contradict.

---

### 15. Luke Colson

**Coda record**

| Field | Value |
|---|---|
| Name | Luke Colson |
| Coda Row ID | `xlsx-row-410` |
| Email | — |
| Phone | — |
| High School | Online |
| Class Year | 2026 |
| Hometown | Goshen, KY |
| TRN ID / URL | `899496` / https://tennisrecruiting.net/player/overview.asp?id=899496 |
| UTR | 10.50 (https://app.utrsports.net/profiles/5530397) |
| WTN | — |
| Pipeline | Active Recruit |
| Interest | High Interest |
| Outcome | — |

**Existing Person**

| Field | Value |
|---|---|
| Name | Luke Colson |
| Person ID | `player-luke-colson` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2030 |
| Hometown | — |
| TRN ID / URL | — |
| UTR | — |
| WTN | — |
| *(also)* Role / status | player / current / active |

**RECOMMENDATION:** MERGE (attach Recruit Profile to `player-luke-colson`; keep `Person.classYear` 2030; store Coda 2026 on `recruitClassYear`; pipeline in Coda is stale relative to roster)

**CONFIDENCE:** Medium

**REASON:** Exact name and a current 2030 player exist, but Coda still says Active Recruit / High Interest rather than Committed - Denison. No email, phone, or hometown on the Person to confirm. CREATE NEW would mint a second Luke Colson.

---

### 16. Minato Koido

**Coda record**

| Field | Value |
|---|---|
| Name | Minato Koido |
| Coda Row ID | `xlsx-row-416` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2026 |
| Hometown | Orlando, FL |
| TRN ID / URL | `971110` / https://tennisrecruiting.net/player/overview.asp?id=971110 |
| UTR | 11.12 (https://app.utrsports.net/profiles/3676947) |
| WTN | — |
| Pipeline | Active Recruit |
| Interest | High Interest |
| Outcome | — |

**Existing Person**

| Field | Value |
|---|---|
| Name | Minato Koido |
| Person ID | `player-minato-koido` |
| Email | — |
| Phone | — |
| High School | — |
| Class Year | 2030 |
| Hometown | — |
| TRN ID / URL | — |
| UTR | — |
| WTN | — |
| *(also)* Role / status | player / current / active |

**RECOMMENDATION:** MERGE (attach Recruit Profile to `player-minato-koido`; keep `Person.classYear` 2030; store Coda 2026 on `recruitClassYear`; Coda pipeline looks stale)

**CONFIDENCE:** Medium

**REASON:** Exact uncommon name and a current 2030 player exist. Coda is still Active Recruit / High Interest, not Committed - Denison. Person has no contact or hometown. KEEP SEPARATE would assume two Minato Koidos.

---

## Summary of review notes (not applied)

| Records | Recommendation | Confidence |
|---|---|---|
| Paxton Au 91 / 364 | MERGE Coda rows | Medium |
| Mateo Rizo-Patron 99 / 230 | MERGE Coda rows | Medium |
| Noah Vinbaytel 126 / 191 | MERGE Coda rows | High |
| Evan Chu 109 / 215 | MERGE Coda rows | Medium |
| Ivan Urbanovich 110 / 182 | MERGE Coda rows | Medium |
| Balin Gupta 19 / 177 | MERGE Coda rows | Low |
| Peter Berns 472 → `player-peter-berns` | MERGE with existing Person | High |
| Jackson MacTaggart 455 → `player-jackson-mactaggart` | MERGE with existing Person | High |
| Luke Colson 410 → `player-luke-colson` | MERGE with existing Person | Medium |
| Minato Koido 416 → `player-minato-koido` | MERGE with existing Person | Medium |

None of the 16 are recommended as CREATE NEW, KEEP SEPARATE, or SKIP on the evidence above. CREATE NEW on the four roster names would duplicate current players. KEEP SEPARATE on the six Coda pairs would require treating TRN Rank drift plus a stub row as a second person, which the stubs do not support with a second TRN ID.

No records were modified.
