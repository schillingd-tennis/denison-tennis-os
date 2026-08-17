# BP-043B — Recruiting Data Architecture

**Status:** Design only. No schema, UI, engines, import, migrations, or commits.  
**Authoritative sources:** `Recruits.xlxs.xlsx`; [`BP-043A_RECRUITING_FORMULA_RECONSTRUCTION.md`](./BP-043A_RECRUITING_FORMULA_RECONSTRUCTION.md); [`BP-043A_RECRUITING_DATA_BLUEPRINT.md`](./BP-043A_RECRUITING_DATA_BLUEPRINT.md).  
**Constraint:** College tennis recruiting OS. Simple, explicit, Coda-compatible for v1. Not a generic CRM.

---

## 1. Executive Summary

A recruit is a **Person** with role `recruit`. The same Person becomes committed recruit, player, then alumni. Recruiting-specific data hangs off a **1:1 Recruit Profile**. Calculated Coda scores are **not** Person fields and **not** a 67-column recruiting table.

**v1 stores:** identity and current tennis/academic facts on Person; recruiting classification, coach evaluation, admissions preread, and recruiting notes on Recruit Profile; a lossless Coda import payload for the original row.

**v1 computes:** the existing Coda analytics engine (pool = WTN present, 30/40/30, inverted TR/WTN Z, 90.48 shrink, observed Tier bands).

**v1 does not build:** communication engine tables beyond the existing Person-agnostic Communication model; tournament scouting; metric time-series; a financial engine.

The proposed starting diagram is mostly right. Two corrections from BP-043A:

1. **Tennis ratings belong on Person** (they persist after enrollment). The analytics engine *reads* them; it does not own them.
2. **Admissions preread is two fields**, not a table. **Academic facts are a slice of Recruit Profile (GPA/SAT/ACT, recruit class year) plus Person high school and Denison `classYear`**, not a second profile entity.

Architecture is ready for a schema milestone (BP-043C). It is not ready to ship UI, import, or engines in the same step.

---

## 2. Architectural Principles

1. **One Person.** Never mint a second identity when a recruit commits or enrolls.
2. **Role ≠ recruiting state.** `role = recruit` is what they are. Pipeline, interest, and outcome are Recruit Profile fields. Person `status` (current/former) is program lifecycle, not recruiting funnel.
3. **Do not duplicate Person fields** on Recruit Profile (`firstName`, `email`, `utr`, `wtn`, …). `recruitClassYear` is **not** a duplicate of `classYear`: one is HS recruiting class, the other is Denison college graduation (BP-043E).
4. **Raw ≠ calculated.** UTR is source data. UTR Rank is engine output.
5. **Preserve Coda v1 behavior**, including quirks, behind explicit compatibility rules. Improvements are a later milestone.
6. **Engines attach; they do not fork identity.** Analytics, Communication, and Scouting all key off `person_id`.
7. **Few tables.** One Recruit Profile. No academic-profile table, no admissions table, no evaluation table for four coach fields.
8. **Lossless import.** Keep the original Coda row (including overloaded Interest / Pipeline values) even when the normalized model splits them.
9. **History is optional later.** v1 stores *current* tennis values on Person. Do not build a time-series engine now; do not block one later.
10. **Reuse what exists.** Communication Engine (BP-032A) is already Person-agnostic. Recruiting should not invent a second message store.

---

## 3. Person vs Recruit Separation

| Lives on Person | Lives on Recruit Profile | Lives in an engine |
|---|---|---|
| Who they are, how to reach them, where they are from | Funnel, coach judgment, admissions preread, recruiting notes | Derived scores, derived contact recency, future scouting |
| Current tennis ratings/rankings (raw) | Schools of interest / school chosen | |
| Denison college `classYear`, high school | HS recruiting class (`recruitClassYear`), recruit type, pipeline, interest, outcome | |
| Remains true as player/alumni | Meaningful while recruiting; **kept** after enrollment as history | Recomputed when inputs change |

**Lifecycle (same `person.id`):**

```
Person role=recruit + RecruitProfile
        → committed (outcome on profile; role still recruit until rostered)
        → role adds/becomes player (RecruitProfile retained)
        → alumni (Person status/role; RecruitProfile retained)
```

Do not delete Recruit Profile when they become a player.

---

## 4. Proposed Recruit Profile

**Cardinality:** one Recruit Profile per Person who has ever been in the recruiting program.

**Not a 67-column person.** Roughly:

| Group | Fields |
|---|---|
| Identity link | `personId`, `codaRowId` (and extra Coda row ids if merged) |
| Classification | `recruitType`, `pipelineStage`, `interest`, `outcome`, plus **legacy raw** Coda pipeline/interest strings |
| Coach evaluation | `priority`, `getability`, `focus` |
| College picture | `schoolsOfInterest`, `schoolChosen` |
| Admissions | `prereadStatus`, `prereadScholarshipAmount` |
| Academics (recruiting-time) | `recruitClassYear`, `gpa`, `sat`, `act`, `academicInterests` |
| Notes | `notes`, `gameNotes`, `keyPitchAngle` |
| Import | `codaExport` JSON (full 67-field row), duplicate-audit status |

**Not on Recruit Profile (permanent columns):** Days Since Contact, Days Since Text, Contact Flag, button columns, any of the 13 Coda analytics columns, tournament lists (v1: park in `codaExport` and/or a single optional text until Scouting exists).

**v1 communication exception:** Import Coda contact blobs into **Communication** records where possible. Until that engine is wired for recruiting, it is acceptable to land leftover text (`contactHistory`, `draftText`, `awaitingReply*`) on the profile as **legacy import fields**, marked deprecated, not as the long-term model.

---

## 5. Field-by-Field Mapping

Every Coda field. “Existing OS Field” is today’s Person/Communication model. Empty = no OS field yet.

| Coda Field | Existing OS Field | Proposed Recruiting Field | Future Engine | Data Type | Notes |
|---|---|---|---|---|---|
| Player Name | — (display from first+last) | — | — | text | Split to `firstName` / `lastName`. Parenthetical nicknames → `preferredName` when present. Do not store a second full-name column. |
| Hometown | `city`, `state`, `country` | — | — | text | Parse `City, ST` into Person address when possible. Unparsed remainder stays in `city` (or a one-time import `hometownRaw` on Person if parse is unsafe). Not a Recruit Profile field. |
| TRN Rank | — | Person `trnRank` (new) | Analytics **input** | number | Raw TennisRecruiting.net rank. Lower better. Distinct from calculated TR Rank. |
| Class Year | `classYear` (Denison college only) | RecruitProfile `recruitClassYear` | — | number | **Coda Class Year is HS graduation / recruiting class, not Denison graduation.** Example: Coda 2026 and Person 2030 are complementary, not a conflict. Never copy Coda Class Year onto `Person.classYear`. Never overwrite an existing Denison `classYear` on import. See BP-043E. |
| Pipeline Stage | — | RecruitProfile `pipelineStage` + `codaPipelineStage` | — | enum + legacy text | See §6. Transfer value is Recruit Type, not a long-term pipeline stage. |
| Priority | — | RecruitProfile `priority` | — | enum | Manual. Labels collide with Tier; **not** Tier. |
| Getability | — | RecruitProfile `getability` | — | enum | Manual likelihood. Not a score input. |
| Outreach | — | Communication events (import) | Communication | text/multi | Tokens (Sent Text, Sent Email, …) become event types, not profile enums. |
| Contact History | Communication `body` | Communication (import) | Communication | long text | 88/88 with Last Contact. One or more Communication rows, not a profile column long-term. |
| Interest | — | RecruitProfile `interest` + `codaInterest` | — | enum + legacy text | Overloaded in Coda. See §6. |
| UTR | `utr` | Person `utr` | Analytics **input** | number | Clean dirty string on import (`10.37 (10.95 doubles)` → 10.37 + note). |
| TR Star Rating | — | Person `trnStarRating` (new) | — | enum | External TRN stars. Not derived from TRN Rank in this export. |
| Email | `personalEmail` | Person `personalEmail` | Communication | text | |
| Phone | `cellPhone` | Person `cellPhone` | Communication | text | |
| Log Interaction | — | **Drop** | — | button | Export artifact (`model`). |
| Tournaments Scouted | — | v1: `codaExport` only | **Scouting** | text | Three event labels. Not Recruit Profile columns. |
| TRN URL | — | Person `trnUrl` (new) | — | url | External source reference. |
| UTR URL | — | Person `utrUrl` (new) | — | url | External source reference. |
| High School | — | Person `highSchool` (new) | — | text | Origin school. Persists after enrollment. Sparse (43). |
| GPA | — | RecruitProfile `gpa` | — | text | Keep as text in v1 (`4.7 w`). Recruiting-time snapshot. |
| SAT | — | RecruitProfile `sat` | — | number | Sparse (4). |
| ACT | — | RecruitProfile `act` | — | number | Column unused in export; keep for parity. |
| Academic Interests | — | RecruitProfile `academicInterests` | — | text | Not Person `major` (that is enrolled major). |
| Schools of Interest | — | RecruitProfile `schoolsOfInterest` | — | text | Free text in v1; not a college entity. |
| School Chosen | — | RecruitProfile `schoolChosen` | — | text | Destination when committed elsewhere. Denison commits were blank. |
| International | `country` | Person geography; not a stored always-false flag | — | — | Coda value is `0` for all 474 rows including Japan/Thailand. **Do not import as `international=false`.** Derive later from `country` if needed. Recruit Type may include `international` as a **category**, not this broken column. |
| Video URL | — | Person `videoUrl` (new) | — | url | Unused in export; Person tennis media. |
| Notes | `notes` is **Person** operational notes | RecruitProfile `notes` | — | long text | Do **not** merge into Person.notes. |
| Game Notes | — | RecruitProfile `gameNotes` | Scouting (later) | long text | Keep as a profile field in v1 (46 rows). Later, observations can copy/move here. |
| First Name | `firstName` | Person `firstName` | — | text | |
| Last Name | `lastName` | Person `lastName` | — | text | |
| Tournaments Attended / Upcoming | — | v1: `codaExport` only | **Scouting** | text | Player calendar, 40 distinct strings. |
| Key Pitch Angle | — | RecruitProfile `keyPitchAngle` | — | long text | Coach positioning. Five rows. Keep as a field, not a table. |
| Created on | `createdAt` | Person `createdAt` | — | datetime | Bulk Coda timestamps. |
| Preread | — | RecruitProfile `prereadStatus` | — | enum | Green / Yellow. Admissions signal. |
| Preread $ | — | RecruitProfile `prereadScholarshipAmount` | — | money/number | **Expected scholarship from admissions preread.** External input. Do not calculate. |
| WTN | `wtn` | Person `wtn` | Analytics **input** | number | Presence defines v1 analytics pool. Lower is better. |
| WTN Rank | — | **Do not store as source** | Analytics **output** | integer | Recompute. |
| TR Rank | — | **Do not store as source** | Analytics **output** | number | Pool rank of TRN Rank + lookup/`-1`. Not Person `trnRank`. |
| UTR Rank | — | **Do not store as source** | Analytics **output** | number | |
| Weighted Score | — | **Do not store as source** | Analytics **output** | number | |
| Composite Rank | — | **Do not store as source** | Analytics **output** | integer | |
| Matches Played | — | Person `utrMatchesPlayed` (new) | Analytics **input** | number | UTR match volume. Current value. |
| WTN Z | — | **Do not store as source** | Analytics **output** | number | |
| TR Z | — | **Do not store as source** | Analytics **output** | number | From **TRN Rank**, not TR Rank. |
| UTR Z | — | **Do not store as source** | Analytics **output** | number | |
| Composite Z | — | **Do not store as source** | Analytics **output** | number | |
| Reliability | — | **Do not store as source** | Analytics **output** | number | |
| Adjusted TR Rank | — | **Do not store as source** | Analytics **output** | number | |
| Reliability Score | — | **Do not store as source** | Analytics **output** | number | |
| Tier | — | **Do not store as source** | Analytics **output** | enum | Display on Recruiting UI from engine. Not coach Priority. |
| Focus | — | RecruitProfile `focus` | — | boolean | Three Coda rows with value `Focus`. |
| Phone E164 | — | Derive from `cellPhone` | — | text | Do not persist a second phone column. |
| Draft Text | Communication (draft) | legacy import or Communication | Communication | long text | Four rows. |
| Send Text | — | **Drop** | Communication (action) | button | |
| Send WhatsApp | — | **Drop** | Communication (action) | button | Add `whatsapp` to Communication types when the engine is used. |
| Last Texted | Communication `createdAt` | derived | Communication | date | |
| Days Since Text | — | **derived, never stored** | Communication | number | |
| Text / WhatsApp Sent | — | **Drop** | — | button | |
| Last Contact | Communication `createdAt` | derived | Communication | date | |
| Days Since Contact | — | **derived, never stored** | Communication | number | |
| Contact Flag | — | **derived, never stored** | Communication | enum | Partial overlay in Coda; not a source of truth. |
| Waiting On Me Question | Communication | Communication / task later | Communication | text | Two rows. |
| Awaiting Reply Since | Communication metadata | derived/legacy | Communication | date | |
| Awaiting Reply Text | Communication `body` | Communication | Communication | long text | |
| Awaiting Reply Days | — | **derived, never stored** | Communication | number | |
| Call Log Entry | Communication `body` | Communication (import) | Communication | long text | Four threads. |

**Person fields that already exist and must not be re-created on Recruit Profile:** `firstName`, `lastName`, `preferredName`, `personalEmail`, `cellPhone`, `city`, `state`, `country`, `classYear` (Denison college year — do not store Coda HS class here), `utr`, `wtn`, `createdAt`, `notes` (Person notes ≠ recruiting notes).

**New Person fields (proposed, not implemented):** `trnRank`, `trnStarRating`, `trnUrl`, `utrUrl`, `utrMatchesPlayed`, `videoUrl`, `highSchool`. Optional import aid: `hometownRaw`.

**Recruit Profile academic year (BP-043E):** `recruitClassYear` — Coda Class Year (HS recruiting class). Required before import. Distinct from `Person.classYear`.

---

## 6. Recruiting Classification Model

These are **five different concepts**. Coda collapsed several of them.

### Recruit Type

What kind of recruit they are. **Independent of funnel.**

Coda has **no** Recruit Type column. `Pipeline Stage = Transfer` (1 row) is a type, not a stage. `International` is geography and is broken in the export.

**Introduce (v1, small enum):**

| Key | Meaning | Coda support |
|---|---|---|
| `high_school` | Standard HS class | Default for almost all rows |
| `transfer` | Transfer | Map the one `Pipeline Stage = Transfer` row |
| `international` | International recruit | **Do not** map from Coda International=0. Set only when Person `country` is clearly non-US **or** coach sets it later |

Do not add further types until data needs them.

### Pipeline Stage

Coach workflow position. **Not** type, interest, or final outcome.

**Coda values (store raw in `codaPipelineStage`):** Potential (327), Active Recruit (80), Committed - Elsewhere (46), Committed - Denison (4), Closed (4), Transfer (1), blank (12).

**Normalized v1 (lossy + lossless raw):**

| Coda Pipeline | `pipelineStage` | `outcome` | `recruitType` |
|---|---|---|---|
| Potential | `potential` | `none` | unchanged / `high_school` |
| Active Recruit | `active` | `none` | |
| Committed - Denison | `committed` | `committed_denison` | |
| Committed - Elsewhere | `committed` | `committed_elsewhere` | |
| Closed | `closed` | `no_longer_recruiting` if Interest is little/no; else `none` | |
| Transfer | `active` or `potential` (blank interest) | `none` | **`transfer`** |
| blank | `unknown` | `none` | |

Keeping `committed` as a pipeline value in v1 matches how coaches use Coda. Outcome is stored **separately** so a later milestone can drop “committed” from pipeline without losing data.

### Interest

How interested the **recruit** appears. **Not** whether we have contacted them. **Not** where they committed.

**Target enum:** `high` | `medium` | `low` | `unknown`

| Coda Interest | Target Interest | Also write |
|---|---|---|
| High Interest | `high` | |
| Medium Interest | `medium` | |
| Little or No Interest | `low` | |
| No Contact | `unknown` | contact state `not_contacted` |
| Committed elsewhere | `unknown` | do **not** use Interest; outcome already on pipeline |
| blank | `unknown` | |

Always keep `codaInterest` for the 15 “Committed elsewhere” and 33 “No Contact” rows.

### Contact State

**Not in Coda as a clean field.** Derive later from Communication:

| State | Heuristic (future) |
|---|---|
| `not_contacted` | No communication events; Coda Interest was No Contact |
| `contacted` | At least one event |
| `active_conversation` | Awaiting-reply event open |

Do not invent a required v1 column if Communication import is deferred; derive when the engine is live.

### Outcome

Terminal (or paused) result. **Not** Interest.

| Key | Coda |
|---|---|
| `none` | Still in funnel |
| `committed_denison` | Pipeline Committed - Denison |
| `committed_elsewhere` | Pipeline Committed - Elsewhere (`schoolChosen` holds destination) |
| `no_longer_recruiting` | Closed (and similar) |

No Enrollment object in the export. Roster conversion is Person role → `player`, not an Outcome enum value.

---

## 7. Academic / Admissions / Financial Model

**Recommendation: A — embed on Recruit Profile + Person, no extra tables.**

| Fact | Home | Why |
|---|---|---|
| HS recruiting class | Recruit Profile `recruitClassYear` | Coda Class Year. Survives enrollment as recruiting history. |
| College class year | Person `classYear` | Denison graduation year. Never filled from Coda Class Year. |
| High school | Person `highSchool` | Origin school; 43 values |
| GPA, SAT, ACT, academic interests | Recruit Profile | Sparse recruiting-time snapshot; GPA is messy text |
| Preread status | Recruit Profile `prereadStatus` | Admissions color (Green/Yellow), 11 rows |
| Preread $ | Recruit Profile `prereadScholarshipAmount` | **Expected scholarship from the admissions preread.** Not family income. Not calculated. 7 rows: 0 / 20000 / 25000 |

A separate Recruit Academic Profile table would be extra joins for 11 GPA rows. If academics become historical (GPA each semester), add snapshots later. Do not collapse HS recruiting class into Denison `classYear`.

**Financial inventory in Coda:** Preread, Preread $, and nothing else. Getability is evaluation, not money.

| Concept | In Coda? | v1 |
|---|---|---|
| Admissions preread color | Yes | Recruit Profile |
| Expected scholarship (Preread $) | Yes | Recruit Profile |
| Recruiting financial evaluation | No | Do not invent |
| Actual awarded scholarship | No | Future Financial / roster aid — not this module |
| Family affordability / EFC | No | Do not invent |

No Financial engine in v1.

---

## 8. Tennis Metrics Model

### A. Current recruit / Person metrics (raw, stored)

| Field | Person |
|---|---|
| UTR | `utr` (exists) |
| WTN | `wtn` (exists) |
| TRN Rank | `trnRank` (new) |
| TR Star Rating | `trnStarRating` (new) |
| Matches Played | `utrMatchesPlayed` (new) |

These are **current** values. Players keep using `utr` / `wtn`.

### B. Historical snapshots (not v1)

Same metric keys with `asOf`. See §13.

### C. External source references (stored on Person)

`trnUrl`, `utrUrl`, `videoUrl`.

### D. Calculated analytics (engine only)

TR Rank, UTR Rank, WTN Rank, TR Z, UTR Z, WTN Z, Weighted Score, Composite Rank, Composite Z, Reliability, Adjusted TR Rank, Reliability Score, Tier.

Optionally persist a **cache row** for directory performance / Coda reconciliation. Cache is not source data. 474 rows can be computed on read in v1.

---

## 9. Recruiting Analytics Engine Boundary

**Do not implement in BP-043B.** v1 logic = current Coda (BP-043A), including quirks.

### INPUTS (Person)

- `trnRank` (raw TRN)
- `utr`
- `wtn`
- `utrMatchesPlayed`

Pool membership: **`wtn` is present** (185 rows in the export). Not class year.

### CALCULATIONS (engine)

- Competition ranks **inside the WTN pool** (lower TRN/WTN better; higher UTR better); outside pool: lookup by value or sentinel `-1`
- Sample SD z-scores from **pool** moments; TR Z and WTN Z inverted; UTR Z not inverted; round 2 decimals
- Weighted Score = 0.30 TR Rank + 0.40 UTR Rank + 0.30 WTN Rank; missing TR → renormalize onto 0.70
- Composite Z = same weights on (preferably unrounded) Zs
- Composite Rank = rank of Weighted Score (lower better); tie rule **PARTIAL** — match Coda as closely as possible; do not invent a new tie-break
- Reliability = `min(matches/30, 1)`; **blank matches → 1** (Coda)
- Adjusted TR Rank = `TR Rank × Rel + 90.48 × (1 − Rel)`; 90.48 is a **v1 legacy constant**; blank TR Rank → blank Adj; `-1` or non-pool → 90.48
- Reliability Score = Weighted Score using Adjusted TR Rank
- Tier from Composite Z (observed):

```
>= 1.50 → 1 - Elite
>= 0.75 → 2 - Strong
>  -0.75 → 3 - Core
>  -1.50 → 4 - Fringe
else     → 5 - Long Shot
```

(No export row sits on −1.50; Core at exactly −0.75 is Fringe — Samuel Schumacher.)

### OUTPUTS

The 13 calculated fields above, plus pool mean/SD used for the run. Display in Recruiting UI. Do not write them onto Person.

Priority / Getability / Preread are **not** inputs.

---

## 10. Communication Engine Boundary

**Reuse** `src/features/communication` (BP-032A): `Communication` keyed by `personId`, types call / text / email / meeting / note. Add `whatsapp` when needed.

**Do not** copy Last Contact, Days Since *, Contact Flag onto Recruit Profile as permanent columns.

| Coda | Engine |
|---|---|
| Contact History, Call Log, Awaiting Reply Text, Draft Text | Communication `body` / metadata |
| Last Contact, Last Texted | `max(createdAt)` by type |
| Days Since * | `today − last event` |
| Contact Flag | derived reminder overlay (optional) |
| Outreach tokens | event types |
| Send * buttons | UI actions, not data |
| Waiting On Me | Communication or a later Task |

v1 import may create one Communication per Coda history blob rather than a perfect thread parse.

---

## 11. Future Tournament Scouting Boundary

**Do not build.** Leave room:

```
Person
  └── ScoutingObservation
        ├── tournament (name / date / site — later entity)
        ├── notes (from Game Notes)
        └── optional link to evaluation
```

Coda fields to park until then: Tournaments Scouted, Tournaments Attended / Upcoming, Game Notes (also on profile for v1 so coaches do not lose them).

---

## 12. Notes / Intelligence Model

**Do not over-normalize.** Three profile text fields are enough for v1:

| Field | Use |
|---|---|
| RecruitProfile `notes` | General recruiting intelligence |
| RecruitProfile `gameNotes` | On-court observations (future scouting can read these) |
| RecruitProfile `keyPitchAngle` | How we sell Denison to this person |

Person `notes` and `familyNotes` stay Person/family workspace. Do not dump recruiting Coda Notes there.

Structured evaluation scores (Priority, Getability, Focus, engine Tier) are fields, not note subtypes.

---

## 13. Historical Data Recommendation

**v1: A — current values only** on Person tennis fields.

**Leave the door open for B — optional snapshots** (`person_id`, `metric`, `value`, `as_of`, `source`) when a coach needs “UTR in January vs now.”

**Do not do C** (full time-series engine) until a workflow requires charts/history.

Analytics already depends on a **pool** of current WTN holders. Historical UTR would not change v1 Coda compatibility if the engine always reads *current* Person metrics.

---

## 14. Duplicate / Migration Strategy

BP-043A: 12 duplicate **names** (24 rows), plus one blank stub. **Do not delete Coda rows.**

```
Coda row
  → Import audit row (raw 67 fields, codaRowId, match status)
  → Canonical Person + Recruit Profile
  → Extra Coda rows linked as duplicates, not extra People
```

**Never auto-merge on name alone.**

**Match confidence (use in combination):**

| Signal | Weight |
|---|---|
| Same TRN URL | Strong |
| Same email or same E.164 phone | Strong |
| Same TRN Rank + class year + hometown | Strong |
| Same name + same hometown + class year | Medium — review |
| Same name only | **Insufficient** |

Each Coda row keeps an import record. Merged extras store `canonicalPersonId` and remain in `codaExport` history. Stub blank-name row: skip Person create; keep in audit.

Dirty UTR: parse numeric prefix; keep original string in `codaExport`.

---

## 15. Legacy Coda Compatibility Rules

Treat as **v1 spec**, not bugs to fix during migration:

1. Analytics pool = Person `wtn` present.  
2. WTN Z = `(mean − player) / sample SD` (inverted).  
3. TR Z inverted from **TRN Rank** using pool TRN moments.  
4. UTR Z non-inverted from pool UTR moments.  
5. Sample SD (`n−1`), round 2 decimals.  
6. Rank universe = that pool; outside = value lookup or `-1`.  
7. Weights 30 / 40 / 30; missing TR renormalizes to 0.70.  
8. Reliability `min(matches/30, 1)`; **blank matches → 1**.  
9. Adjusted TR Rank shrinks toward **90.48** (v1 constant). Blank TR Rank → blank Adj. Non-pool / `-1` → 90.48.  
10. Tier bands as in §9 (Core is `> -0.75`).  
11. Do not “fix” Weighted Score 0.05-class residuals with new terms.  
12. Composite Rank ties: prefer shared rank when Coda shared; do not invent Zhang/Chabot split logic beyond matching export if recomputing.  
13. Coda International=0 is not a data fact.  
14. Overloaded Interest/Pipeline strings stay in `codaInterest` / `codaPipelineStage`.

A later milestone may replace this engine. That is not BP-043B/C.

---

## 16. Proposed Entity Relationship Diagram

Refined from the prompt. **No extra academic/admissions/evaluation tables.** Communication already exists.

```
Person                              ← existing
  │  identity, contact, address
  │  classYear (Denison college graduation)
  │  highSchool
  │  utr, wtn, trnRank, trnStarRating
  │  utrMatchesPlayed, trnUrl, utrUrl, videoUrl
  │
  ├── RecruitProfile                ← NEW 1:1
  │     recruitType
  │     pipelineStage, codaPipelineStage
  │     interest, codaInterest
  │     outcome
  │     priority, getability, focus
  │     schoolsOfInterest, schoolChosen
  │     recruitClassYear            ← HS recruiting class (Coda Class Year)
  │     gpa, sat, act, academicInterests
  │     prereadStatus, prereadScholarshipAmount
  │     notes, gameNotes, keyPitchAngle
  │     codaRowId, codaExport
  │
  ├── Communication[]               ← existing engine (BP-032A)
  │
  ├── (computed) AnalyticsResult    ← not a Person column
  │
  ├── (future) MetricSnapshot[]
  │
  └── (future) ScoutingObservation[]
```

**Recruiting Analytics Engine** reads Person tennis fields (and pool membership). Writes nothing required.

**Communication Engine** reads/writes Communication. Derives last contact / days / flags.

**Scouting Engine** does not exist yet.

---

## 17. BP-043C Recommendation

**BP-043C — Recruit Profile schema and Person tennis/school fields** (implementation of this architecture, still no Recruiting UI and no live Coda import to production).

Include:

- New Person fields listed in §5 (catalog + types only; UI freeze unless a milestone authorizes it — prefer catalog/schema without Adaptive Workspace layout changes).
- `RecruitProfile` table + TypeScript types + field catalog owned by Recruiting (not a second Person catalog).
- Lookups/enums: recruit type, pipeline, interest, outcome, priority, getability, preread status.
- `codaExport` / `codaRowId` columns for lossless import.
- Analytics engine **spec frozen in code comments or a pure function module**, not wired to UI.

Explicitly **defer:** production Coda migration, duplicate merge UI, Communication import, scouting, historical metrics, scoring “improvements,” Recruiting Workspace.

**BP-043D** (suggested): dry-run Coda import + duplicate audit (no deletes).  
**BP-043E:** Class year semantics correction (`recruitClassYear`) before import; analytics engine v1 remains after imported data.  
**BP-043F:** Recruiting directory / workspace UI (explicit UI milestone).

---

## Unresolved (do not block BP-043C schema)

1. Parse Hometown into `city`/`state`/`country` vs keep `hometownRaw` — schema can include optional `hometownRaw`.  
2. Whether `international` recruit type is coach-set only until country data is trusted.  
3. Persist analytics cache vs compute-on-read (474 rows: compute-on-read is enough).  
4. Exact Composite Rank tie-break (PARTIAL in BP-043A).  
5. When Communication import happens (043D vs later).  
6. Whether `pipelineStage = committed` stays in the UI long-term (data model already separates Outcome).

None of these require inventing tables. None are licenses to change Coda scoring.
