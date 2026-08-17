# BP-043A — Recruiting Data Blueprint

**Status:** Discovery / architectural documentation only. No schema, UI, or formula changes.  
**Authoritative source:** `Dropbox/@Inbox/zArchive/  Delete/Recruits.xlxs.xlsx`  
**Companion:** [`BP-043A_RECRUITING_FORMULA_RECONSTRUCTION.md`](./BP-043A_RECRUITING_FORMULA_RECONSTRUCTION.md)

**Records:** 474  
**Fields:** 67  
**Analytics pool:** 185 rows with WTN (all 185 also have UTR; 180 have TRN Rank)

Recruit = Person with role `recruit`. The same Person persists through Recruit → Committed → Player → Alumni. Ownership below is **future architecture**, not a schema change.

**Ownership keys**

| Code | Meaning |
|---|---|
| **Person** | Person core data (identity, contact, academics, tennis ratings that persist after enrollment) |
| **Recruiting** | Recruiting module (pipeline, interest, communication, evaluation, classification) |
| **Engine** | Future recruiting analytics / scoring engine (consume Person + Recruiting inputs; do not duplicate) |
| **Scouting** | Future tournament scouting engine candidate |
| **Artifact** | Coda control/button column leaked into the export; not a data field |

**Source keys:** Manual · External (TRN/UTR/WTN) · Calculated · System · Button

---

## 1. Complete 67-field inventory

| # | Field | Type (observed) | Populated | Unique (nonblank) | Source | Domain | Ownership | Formula / logic |
|---|---|---|---|---|---|---|---|---|
| 1 | Player Name | text | 473 (99.8%) | 461 | Manual | Identity | Person | Display name. 1 blank stub row. 12 duplicate names (likely duplicate Coda rows, not two people in every case). |
| 2 | Hometown | text | 411 (86.7%) | 294 | Manual | Geographic | Person | Free text (`City, ST` plus countries). Not parsed into city/state/country. |
| 3 | TRN Rank | number | 430 (90.7%) | 276 | External | Rankings | Person | Raw TennisRecruiting.net ranking. Lower is better. Distinct from **TR Rank**. |
| 4 | Class Year | number/year | 425 (89.7%) | 5 | Manual | Academic | Recruiting | HS graduation / recruiting class (2025–2029; 2027=216). **Not** Denison `Person.classYear`. Maps to `RecruitProfile.recruitClassYear` (BP-043E). |
| 5 | Pipeline Stage | enum | 462 (97.5%) | 6 | Manual | Pipeline | Recruiting | See Status / Pipeline audit. **Not** Recruit Type (no such column). |
| 6 | Priority | enum | 201 (42.4%) | 4 | Manual | Evaluation | Recruiting | `1 - Elite` … `4 - Probably Not`. Label-collides with Tier; **not** Tier (1/110 pool match). |
| 7 | Getability | enum | 43 (9.1%) | 5 | Manual | Evaluation | Recruiting | `1 - Highly Likely` … `5 - No Chance`. Does **not** enter Weighted Score / Tier. |
| 8 | Outreach | multi-select / text | 29 (6.1%) | 9 | Manual | Communication | Recruiting | Mixed tokens: Sent Text, Sent Email, Responded, Checked out TRN Page, Phone Call, plus free text. |
| 9 | Contact History | long text | 88 (18.6%) | 73 | Manual | Communication | Recruiting | 88/88 coincide with Last Contact. |
| 10 | Interest | enum | 133 (28.1%) | 5 | Manual | Interest | Recruiting | Includes **No Contact** and **Committed elsewhere** (should not permanently live here; documented as-is). |
| 11 | UTR | number (1 dirty string) | 253 (53.4%) | 142 | External | Ratings | Person | One dirty value: `10.37 (10.95 doubles)`. |
| 12 | TR Star Rating | enum (stars) | 116 (24.5%) | 3 | External | Rankings | Person | 3/4/5 stars. Overlaps TRN ranges; **not** a function of TRN Rank in this sheet. |
| 13 | Email | text | 95 (20.0%) | 95 | Manual | Contact | Person | |
| 14 | Phone | text | 105 (22.2%) | 105 | Manual | Contact | Person | |
| 15 | Log Interaction | button artifact | 474 (100%) | 1 | Button | Workflow | Artifact | Every row = `model`. Not a data field. |
| 16 | Tournaments Scouted | text / multi | 50 (10.5%) | 3 | Manual | Events / Tournaments | Scouting | Only 3 labels: Rome L2; L4 Open Memorial Day; both. |
| 17 | TRN URL | url | 274 (57.8%) | 273 | External | Rankings | Person | 156 TRN Rank without URL; 0 URL without inspecting further gaps. |
| 18 | UTR URL | url | 243 (51.3%) | 242 | External | Ratings | Person | |
| 19 | High School | text | 43 (9.1%) | 42 | Manual | School / Club | Person | Sparse. |
| 20 | GPA | text/number | 11 (2.3%) | 9 | Manual | Academic | Person | Includes `4.7 w`. |
| 21 | SAT | number | 4 (0.8%) | 4 | Manual | Academic | Person | 1260, 1300, 1440, 1560. |
| 22 | ACT | — | **0** | 0 | Manual | Academic | Person | Column exists, unused. |
| 23 | Academic Interests | text | 53 (11.2%) | 42 | Manual | Academic | Person | |
| 24 | Schools of Interest | text | 63 (13.3%) | 63 | Manual | Recruiting Classification | Recruiting | Free text, not a controlled college list. |
| 25 | School Chosen | text | 43 (9.1%) | 29 | Manual | Outcome | Recruiting | Used mainly for committed-elsewhere destinations. Denison commits have it blank. |
| 26 | International | boolean/number | 474 (100%) | 1 | Calculated? | Geographic | Person | **Always `0`**, including Japan/Thailand/Italy/UK. Unused or broken. |
| 27 | Video URL | url | **0** | 0 | Manual | Tennis Performance | Person | Column exists, unused. |
| 28 | Notes | long text | 53 (11.2%) | 53 | Manual | Notes | Recruiting | General notes. |
| 29 | Game Notes | long text | 46 (9.7%) | 46 | Manual | Evaluation | Recruiting / Scouting | On-court observations. |
| 30 | First Name | text | 473 (99.8%) | 318 | Calculated? | Identity | Person | Split from Player Name; some parenthetical nicknames remain in Player Name. |
| 31 | Last Name | text | 473 (99.8%) | 434 | Calculated? | Identity | Person | |
| 32 | Tournaments Attended / Upcoming | text / multi | 85 (17.9%) | 40 | Manual | Events / Tournaments | Scouting | Player schedule, not coach scout list. |
| 33 | Key Pitch Angle | long text | 5 (1.1%) | 5 | Manual | Evaluation | Recruiting | Sales/positioning notes. |
| 34 | Created on | datetime | 474 (100%) | 57 | System | Workflow | Recruiting | Bulk import timestamps (e.g. 99 rows at `5/17/2026, 5:24 AM`). |
| 35 | Preread | enum | 11 (2.3%) | 2 | Manual | Financial | Recruiting | `Green` (7), `Yellow` (4). Admissions affordability signal. |
| 36 | Preread $ | number | 7 (1.5%) | 3 | Manual | Financial | Recruiting | 0, 20000, 25000. Not a function of GPA/SAT in this sheet. |
| 37 | WTN | number | 185 (39.0%) | 49 | External | Ratings | Person | **Defines the analytics pool.** Lower is better. |
| 38 | WTN Rank | integer | 185 (39.0%) | 49 | Calculated | Calculated Metrics | Engine | Competition rank of WTN in pool. **CONFIRMED.** |
| 39 | TR Rank | number | 430 (90.7%) | 177 | Calculated | Calculated Metrics | Engine | Pool competition rank of TRN + lookup/`-1`. **CONFIRMED.** Not TRN Rank. |
| 40 | UTR Rank | number | 253 (53.4%) | 117 | Calculated | Calculated Metrics | Engine | Pool competition rank of UTR + lookup/`-1`. **CONFIRMED.** |
| 41 | Weighted Score | number | 185 (39.0%) | 183 | Calculated | Calculated Metrics | Engine | 30/40/30 rank mix. **HIGH.** |
| 42 | Composite Rank | integer | 185 (39.0%) | 184 | Calculated | Calculated Metrics | Engine | Rank of Weighted Score. **HIGH**; ties **PARTIAL.** |
| 43 | Matches Played | number | 179 (37.8%) | 72 | External | Ratings | Person | UTR match volume. Only filled in the WTN pool. |
| 44 | WTN Z | number | 185 (39.0%) | 49 | Calculated | Calculated Metrics | Engine | Inverted pool z. **CONFIRMED.** |
| 45 | TR Z | number | 430 (90.7%) | 276 | Calculated | Calculated Metrics | Engine | Inverted pool z of **TRN Rank**. **CONFIRMED.** |
| 46 | UTR Z | number | 252 (53.2%) | 141 | Calculated | Calculated Metrics | Engine | Pool z of UTR. **CONFIRMED.** Missing for dirty UTR string. |
| 47 | Composite Z | number | 185 (39.0%) | 141 | Calculated | Calculated Metrics | Engine | 30/40/30 z mix. **HIGH.** |
| 48 | Reliability | number 0–1 | 185 (39.0%) | 21 | Calculated | Calculated Metrics | Engine | `min(matches/30,1)`. **CONFIRMED.** |
| 49 | Adjusted TR Rank | number | 430 (90.7%) | 176 | Calculated | Calculated Metrics | Engine | Shrink toward 90.48. **HIGH.** |
| 50 | Reliability Score | number | 185 (39.0%) | 183 | Calculated | Calculated Metrics | Engine | Weighted Score using Adj TR Rank. **HIGH.** |
| 51 | Tier | enum | 185 (39.0%) | 5 | Calculated | Recruiting Classification | Engine | From Composite Z. **CONFIRMED** with observed bands. |
| 52 | Focus | flag | 3 (0.6%) | 1 | Manual | Evaluation | Recruiting | Value `Focus` on Tokukura, Harashima, Sagone. |
| 53 | Phone E164 | text | 105 (22.2%) | 105 | Calculated | Contact | Person | Filled iff Phone filled. Normalized phone. |
| 54 | Draft Text | long text | 4 (0.8%) | 4 | Manual | Communication | Recruiting | Outbound draft body. |
| 55 | Send Text | button artifact | 474 (100%) | 2 | Button | Workflow | Artifact | `system` (470) / `model` (4, rows with Draft Text). |
| 56 | Send WhatsApp | button artifact | 474 (100%) | 2 | Button | Workflow | Artifact | Same pattern as Send Text. |
| 57 | Last Texted | date | 53 (11.2%) | 30 | Manual/system | Communication | Recruiting | |
| 58 | Days Since Text | number | 53 (11.2%) | 30 | Calculated | Communication | Recruiting | Filled iff Last Texted. Relative to export date. |
| 59 | Text / WhatsApp Sent | button artifact | 474 (100%) | 2 | Button | Workflow | Artifact | Same `system`/`model` pattern. |
| 60 | Last Contact | date | 88 (18.6%) | 45 | Manual/system | Communication | Recruiting | 88/88 with Contact History; 0 history-only or last-only. |
| 61 | Days Since Contact | number | 88 (18.6%) | 45 | Calculated | Communication | Recruiting | Filled iff Last Contact. Min 8, max 389 in this export. |
| 62 | Contact Flag | enum | 81 (17.1%) | 4 | Calculated? | Communication | Recruiting | `Never Contacted` (32), `Due 10d+` (17, days 10–19), `Overdue 21d+` (28, days 21–389), `Recent` (4, days 8–9). **Not** applied to all uncontacted rows (386 have no Last Contact; only 32 flagged Never Contacted). **PARTIAL.** |
| 63 | Waiting On Me Question | text | 2 (0.4%) | 2 | Manual | Communication | Recruiting | Coach-owes-action snippet. |
| 64 | Awaiting Reply Since | date | 15 (3.2%) | 13 | Manual/system | Communication | Recruiting | |
| 65 | Awaiting Reply Text | long text | 15 (3.2%) | 15 | Manual | Communication | Recruiting | Last outbound snippet waiting on the recruit. |
| 66 | Awaiting Reply Days | number | 15 (3.2%) | 13 | Calculated | Communication | Recruiting | Filled iff Awaiting Reply Since. |
| 67 | Call Log Entry | long text | 4 (0.8%) | 4 | Manual | Communication | Recruiting | Thread-style call/text log. |

**There is no `Recruit Type` column** in this export.

---

## 2. Person vs Recruiting vs Engine

### A. Person core (persists after the recruiting cycle)

Identity: Player Name, First Name, Last Name  
Contact: Email, Phone, Phone E164  
Geographic: Hometown (future: parse to city/state/country). International **should** live here once it actually works.  
Academic: High School on Person; GPA, SAT, ACT, Academic Interests, and **HS recruiting class (Coda Class Year)** on Recruit Profile. Denison college graduation is Person `classYear` and is a different fact (BP-043E).  
Tennis ratings/rankings (raw): UTR, WTN, TRN Rank, TR Star Rating, TRN URL, UTR URL, Matches Played, Video URL  
System: Created on may be Person.createdAt after import.

### B. Recruiting module

Pipeline Stage, Priority, Getability, Interest, Focus  
Outreach, Contact History, Last Contact, Days Since Contact, Contact Flag  
Last Texted, Days Since Text, Draft Text, Waiting On Me, Awaiting Reply *, Call Log Entry  
Schools of Interest, School Chosen  
Notes, Game Notes, Key Pitch Angle  
Preread, Preread $  
Tournaments Scouted / Attended (until a scouting engine exists)

### C. Future recruiting engine (calculated; do not store as Person facts)

WTN Rank, TR Rank, UTR Rank  
TR Z, UTR Z, WTN Z, Composite Z, Tier  
Weighted Score, Composite Rank  
Reliability, Adjusted TR Rank, Reliability Score  
Pool definition, weights 30/40/30, 90.48 shrink, match cap 30

### D. Future tournament scouting engine

Tournaments Scouted, Tournaments Attended / Upcoming, Game Notes, plus call-log event mentions (e.g. Stowe). Not built in this milestone.

### E. Export artifacts — do not model as Person fields

Log Interaction, Send Text, Send WhatsApp, Text / WhatsApp Sent

---

## 3. Status / Pipeline audit (current Coda, not a redesign)

**Pipeline Stage** (462/474) is the primary funnel field:

| Value | n | Notes |
|---|---|---|
| Potential | 327 | Default mass of the list |
| Active Recruit | 80 | |
| Committed - Elsewhere | 46 | Outcome living on the pipeline |
| Committed - Denison | 4 | Tokukura, Harashima, MacTaggart, Berns. School Chosen blank |
| Closed | 4 | |
| Transfer | 1 | Ricardo Espalliat, Class 2025, no WTN |
| (blank) | 12 | |

**Interest** (133/474) is a separate field that currently **mixes interest, contact state, and outcome**:

| Value | n | Typical pipeline |
|---|---|---|
| High Interest | 42 | Mostly Active Recruit (40); 2 Denison commits |
| No Contact | 33 | Mostly Potential (28); 5 Active Recruit |
| Medium Interest | 30 | Mixed Active / Potential |
| Committed elsewhere | 15 | All have Pipeline = Committed - Elsewhere; **31 other Elsewhere rows have Interest blank** |
| Little or No Interest | 13 | Mixed |

Documented product intent (not implemented here): Recruit Type ≠ Pipeline Stage; Interest ≠ Outcome; No Contact and Committed Elsewhere should not permanently live inside Interest.

**There is no Active / Inactive / Lost / Enrollment field** besides Pipeline Stage and Interest.

**Priority** is a manual coach ranking that **reuses Elite/Potential-style labels** but is independent of calculated **Tier**.

**Focus** is a 3-row flag, not a pipeline stage.

---

## 4. Financial data (as-is)

| Field | Role | n | Values |
|---|---|---|---|
| Preread | Admissions/affordability color | 11 | Green 7, Yellow 4 |
| Preread $ | Dollar figure (need / award / EFC — **unknown which**) | 7 | 0, 20000, 25000 |
| Getability | Coach judgment of likelihood | 43 | 1–5 scale |

No FAFSA, EFC, family income, or aid-category columns.

**Dependencies:** None into Weighted Score, Composite Z, or Tier. Pool rows have scores with Getability blank (147/185). Preread $ is not a function of GPA/SAT in this export (too few rows; Dawson Daves Yellow/$0 vs Daven Aga Yellow/$20000).

Do not redesign financial logic in this phase.

---

## 5. Communication (as-is)

**Stored:** Outreach, Contact History, Last Contact, Last Texted, Draft Text, Waiting On Me Question, Awaiting Reply Since/Text, Call Log Entry, Email, Phone.

**Calculated operational:** Phone E164, Days Since Text, Days Since Contact, Awaiting Reply Days. Contact Flag is a **partial** overlay (only 81 rows), not a full state machine.

**Buttons in export:** Log Interaction, Send Text, Send WhatsApp, Text / WhatsApp Sent (`model`/`system`).

This is a **lightweight Coda follow-up overlay**, not a full workflow engine (no cadences, no owner field, no SLA object). Coach ownership is not a column.

---

## 6. Tournament scouting candidates

| Field | n | Role |
|---|---|---|
| Tournaments Scouted | 50 | Coach-at-event tags (Rome L2, one L4 Open) |
| Tournaments Attended / Upcoming | 85 | Player calendar (40 distinct strings) |
| Game Notes | 46 | Observation notes |
| Call Log Entry | 4 | Includes live-event logistics |

Flag for a future Tournament Scouting engine. Do not build it in BP-043A.

---

## 7. Calculated-field summary

**Analytics engine (13):** WTN Rank, TR Rank, UTR Rank, Weighted Score, Composite Rank, Matches-driven Reliability, WTN Z, TR Z, UTR Z, Composite Z, Adjusted TR Rank, Reliability Score, Tier.

| Confidence | Fields |
|---|---|
| **CONFIRMED** | WTN Rank, TR Rank, UTR Rank, TR Z, UTR Z, WTN Z, Reliability, Tier |
| **HIGH** | Weighted Score, Composite Z, Composite Rank (structure), Adjusted TR Rank, Reliability Score |
| **PARTIAL** | Composite Rank **ties**; origin of 90.48 |
| **UNKNOWN** | Live vs frozen Z moments; original Coda text |

**Operational calculated (not scoring):** Phone E164 (**HIGH**), Days Since Text (**HIGH**), Days Since Contact (**HIGH**), Awaiting Reply Days (**HIGH**), Contact Flag (**PARTIAL**), First/Last Name splits (**PARTIAL**), International (**UNKNOWN** / broken).

---

## 8. Data-quality issues

1. **12 duplicate Player Names** (24 rows) — split records (different TRN, one row with UTR/WTN and one without), e.g. Paxton Au, Mateo Rizo-Patron, Aidan Bart.  
2. **1 blank-name stub row** (only button/system fields).  
3. **Dirty UTR** `10.37 (10.95 doubles)` → UTR Rank `-1`, no UTR Z.  
4. **International always 0** despite many non-US hometowns.  
5. **Interest vs Pipeline inconsistency:** Committed - Elsewhere (46) vs Interest “Committed elsewhere” (15). No Contact lives on Interest.  
6. **Denison commits** have blank School Chosen.  
7. **Priority vs Tier label collision** with almost no agreement.  
8. **TR Rank = -1** on 129 rows (TRN not in the rated cohort) — easy to misread as an error.  
9. **Blank Matches Played → Reliability 1.00** on 6 pool rows (including Denison commits).  
10. **Hometown** unparsed (`Chicago` vs `Chicago, IL`; `Atherton, California`; `Kalamazoo, Michigan`).  
11. **GPA** stored as text (`4.7 w`).  
12. **ACT and Video URL** unused.  
13. **Button columns** (`model`/`system`) are not recruiting data.  
14. **TRN URL / UTR URL** incomplete vs rank/rating fills.

---

## 9. Current Coda logic to preserve exactly (until a later, explicit change)

Until BP-043B+ decides otherwise, treat as the current engine:

- Analytics pool = WTN present  
- 30% TR / 40% UTR / 30% WTN with renormalization  
- Competition ranks inside that pool  
- Sample-SD z-scores from pool moments; TR and WTN inverted  
- Reliability = min(matches/30, 1)  
- Adjusted TR Rank shrink toward 90.48  
- Tier from Composite Z with Core = `> -0.75`

---

## 10. Current logic that appears questionable — do **not** change yet

- WTN Z inversion vs the originally written formula  
- Blank matches → Reliability 1  
- Ranking / z-scoring a WTN-complete subset, then looking up those ranks onto other class years  
- TR Rank / UTR Rank = `-1` outside the cohort  
- 90.48 possibly a live mean (moves when the pool moves)  
- Weighted Score residuals of ~0.05  
- Inconsistent Composite Rank ties  
- International flag unused  
- Interest overloaded with No Contact and Committed elsewhere  
- Priority labels colliding with Tier

These are **questions**, not licenses to “improve” scoring in this phase.

---

## Questions for David

Only items this workbook cannot answer.

**QUESTION 1:** Is the current WTN Z inversion intentional?

**WHAT THE DATA SHOWS:** Exported WTN Z = `(mean WTN − player WTN) / sample SD` (185/185). The written convention `(player WTN − mean) / SD` matches 0/185. TR Z and UTR Z already make higher Z = better.

**OPTIONS:**  
A. Keep inversion (higher Z = better on all three).  
B. Revert WTN Z to the written formula (would flip WTN Z and change Composite Z / Tier).  
C. Decide later; document both.

**RECOMMENDATION:** A for “higher Z = better” consistency, but do not change Coda/app until explicitly chosen.

---

**QUESTION 2:** What rule fills WTN for the 185-row analytics pool?

**WHAT THE DATA SHOWS:** Pool = WTN present. Mostly 2027 (151) + blank class year (31). Class-year formulas fail. Not “all recruits.”

**OPTIONS:**  
A. Manual / import completeness (whoever has a WTN).  
B. A Coda filter (class, status, “rated” checkbox) not visible in the export.  
C. A second Coda table.

**RECOMMENDATION:** Confirm the Coda filter/view name before BP-043B copies the pool definition.

---

**QUESTION 3:** Is 90.48 a live average, a constant, or a lookup?

**WHAT THE DATA SHOWS:** Equals `round(mean(pool TR Rank), 2)` = 90.48. Mean of all non-`-1` TR Rank in the workbook is 82.70.

**OPTIONS:**  
A. `Average(TR Rank)` on the same filter as the pool.  
B. Hardcoded 90.48.  
C. Value from another Coda table.

**RECOMMENDATION:** Open the Coda formula for Adjusted TR Rank. Do not guess.

---

**QUESTION 4:** Are Weighted Score residuals of 0.03–0.06 expected Coda rounding?

**WHAT THE DATA SHOWS:** 71/185 exact at 0.01; max error 0.06 (e.g. Ethan Chen 70.35 vs 70.30). OLS weights still 30/40/30.

**OPTIONS:**  
A. Accept as Coda rounding.  
B. There is another term / Round mode.  
C. Investigate in Coda formula text.

**RECOMMENDATION:** C if the Coda doc is available; otherwise treat 30/40/30 + renormalize as the engine.

---

**QUESTION 5:** How should tied Weighted Scores rank?

**WHAT THE DATA SHOWS:** Nekrasov/Johnson 30.99 → Composite Rank 27/27. Zhang/Chabot 51.20 exactly → 51/52. Hidden precision of 30/40/30 does not explain the split.

**OPTIONS:**  
A. Competition rank (share).  
B. Sequential with a tie-break (name, row id, another metric).  
C. Leave unspecified until Coda Rank() is inspected.

**RECOMMENDATION:** C. Do not invent a tie-break for the new engine yet.

---

**QUESTION 6:** Confirm Tier at exactly −0.75.

**WHAT THE DATA SHOWS:** Samuel Schumacher Composite Z −0.75 → **4 - Fringe**. `>= -0.75` Core is wrong by one row. `> -0.75` Core is 185/185.

**OPTIONS:**  
A. Core is `> -0.75` (Fringe includes −0.75).  
B. Boundary bug in Coda.  
C. Compare unrounded Z in Coda (this export’s unrounded mix still places him in Fringe).

**RECOMMENDATION:** A as current behavior.

---

**QUESTION 7:** Confirm `TR Rank = -1` / `UTR Rank = -1`.

**WHAT THE DATA SHOWS:** Means “this TRN/UTR value is not in the WTN-complete ranking universe,” not a national rank. 129 TR Rank values are −1.

**OPTIONS:**  
A. Intended sentinel.  
B. Coda Rank() artifact.  
C. Replace with blank in a future engine (later).

**RECOMMENDATION:** Treat as intended sentinel of the current engine; do not change yet.

---

**QUESTION 8:** Should blank Matches Played mean Reliability = 1?

**WHAT THE DATA SHOWS:** Six pool rows, including two Denison commits, have blank matches and Reliability 1.00, so Adjusted TR Rank = TR Rank when TR exists.

**OPTIONS:**  
A. IfBlank(matches, 30) / treat as fully reliable.  
B. IfBlank should be 0 or blank scores.  
C. Data gap (WTN filled, UTR matches not).

**RECOMMENDATION:** C + confirm IfBlank in Coda. Do not change the formula yet.

---

**QUESTION 9:** What is Preread $?

**WHAT THE DATA SHOWS:** 0 / 20000 / 25000 beside Green/Yellow. Not used in scores. Too few rows to infer a threshold table.

**OPTIONS:**  
A. Estimated family need.  
B. Merit/aid number from admissions.  
C. Something else.

**RECOMMENDATION:** Ask; do not build financial engine logic from 7 rows.

---

**QUESTION 10:** Duplicate Person rows — merge before import?

**WHAT THE DATA SHOWS:** 12 names appear twice (different created-on, often one rated row and one unrated row).

**OPTIONS:**  
A. Merge in Coda before any import.  
B. Import as-is and dedupe in OS later.  
C. Keep both (true different people — unlikely for most of these).

**RECOMMENDATION:** A for obvious splits (same hometown + similar TRN). Confirm each pair.

---

End of blueprint. No application, schema, or scoring changes were made.
