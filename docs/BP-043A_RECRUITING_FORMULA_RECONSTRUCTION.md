# BP-043A — Recruiting Formula & Logic Reconstruction

**Status:** Discovery only. No application, schema, Coda, or scoring changes.  
**Authoritative source:** `Dropbox/@Inbox/zArchive/  Delete/Recruits.xlxs.xlsx`  
**Workbook:** sheet `Sheet 1 - Recruits`; title row + **67 headers** + **474 data rows**.  
**Export type:** **values only** (no Coda formulas). Reconstructions are reverse-engineered from those values.

Older recruiting trackers in Downloads were not used.

| Label | Meaning |
|---|---|
| **CONFIRMED** | Reproduces exported values essentially exactly. |
| **HIGH** | Structure is established; remaining error is rounding, a documented boundary, or an unproven Coda primitive. |
| **PARTIAL** | Relationship is clear; complete logic is not proven. |
| **UNKNOWN** | This export cannot reconstruct it. |

---

## Executive Summary

Coda recruiting analytics is **not** computed on all 474 rows. It is computed on a **complete-rating cohort**:

**Pool = rows with WTN filled (n = 185).**  
Every pool row also has numeric UTR. 180/185 also have TRN Rank. Empirically the pool is Class 2027 (151) + blank class year (31) + 2026 (2) + 2028 (1). That is a **data-fill pattern**, not a class-year formula. Class-year-only means/SDs **fail**.

Within the pool:

- Ranks are **competition ranks** (`RANK.EQ` / min-rank). Lower TRN and WTN are better; higher UTR is better.
- Z-scores use **pool means** and **sample SD** (`n−1`), then round to 2 decimals.
- **TR Z** and **WTN Z are inverted** so higher Z = better recruit.
- Two parallel 30/40/30 mixes:
  - Rank space → **Weighted Score** → **Composite Rank**
  - Z space → **Composite Z** → **Tier**
- Missing TR Rank **renormalizes** onto the remaining 70%.
- **Reliability** = `min(Matches Played / 30, 1)` (blank matches → 1 in this export).
- **Adjusted TR Rank** shrinks TR Rank toward **90.48** using **unrounded** reliability. It is blank when TR Rank is blank (five international/committed pool rows). It is **90.48** when TR Rank is `-1` or the row is outside the pool.
- **Reliability Score** is Weighted Score with Adjusted TR Rank in place of TR Rank.
- **TR Rank / UTR Rank are not national ranking IDs** and **not** ranks of every TRN/UTR in the 474-row table. Max TR Rank = **180**; max UTR Rank = **185**. They **are** competition ranks inside the WTN pool, plus a value-lookup / `-1` rule outside the pool.

**Whole-table mean/SD does not reproduce TR Z, UTR Z, or WTN Z.**

---

## Formula Reconstruction Table

| Field | Inputs | Formula | Validation | Confidence |
|---|---|---|---|---|
| WTN Rank | WTN | Competition rank of WTN among 185; lower WTN = 1 | 185/185 exact | **CONFIRMED** |
| TR Rank | TRN Rank, pool | Competition rank of TRN among 180 pool TRN values; outside pool: lookup by TRN value else `-1` | 430/430 exact | **CONFIRMED** |
| UTR Rank | UTR, pool | Competition rank of UTR among 185 pool UTRs (higher = 1); outside: lookup else `-1` | 253/253 exact | **CONFIRMED** |
| TR Z | TRN Rank; pool TRN μ,s | `round((μ − TRN) / s_sample, 2)` μ=147.272222 s=52.931476 n=180 | 430/430 exact | **CONFIRMED** |
| UTR Z | UTR; pool UTR μ,s | `round((UTR − μ) / s_sample, 2)` μ=10.835243 s=0.445188 n=185 | 252/252 exact | **CONFIRMED** |
| WTN Z | WTN; pool WTN μ,s | `round((μ − WTN) / s_sample, 2)` μ=22.391351 s=1.318485 n=185 (**inverted**) | 185/185 exact | **CONFIRMED** |
| Weighted Score | TR/UTR/WTN Rank | `0.30·TR + 0.40·UTR + 0.30·WTN`; if no TR: `(0.40·UTR + 0.30·WTN)/0.70` | n=185 exact=71 ≤0.01=154 max=0.06 mae=0.0092 | **HIGH** |
| Composite Rank | Weighted Score | Rank of Weighted Score in the pool; lower WS = better | 184/185 competition; one displayed tie split 51/52 | **HIGH** (ties **PARTIAL**) |
| Composite Z | TR/UTR/WTN Z | Same 30/40/30 mix; mix **unrounded** component Z, then round to 2 dp | n=185 exact=183 ≤0.01=185 max=0.01 | **HIGH** |
| Reliability | Matches Played | `min(m/30, 1)`; displayed `round(..., 2)`; blank m → 1 | 185/185 displayed exact | **CONFIRMED** |
| Adjusted TR Rank | TR Rank, unrounded Rel, 90.48 | `TR×Rel + 90.48×(1−Rel)`; `-1` or outside pool → 90.48; blank TR → blank | 428/430 within 0.01 after 2-dp; 2 off by 0.006 vs round-half-up | **HIGH** |
| Reliability Score | Adj TR, UTR Rank, WTN Rank | Same mix as Weighted Score | Same residual pattern as Weighted Score | **HIGH** |
| Tier | Composite Z | See observed bands below (`> -0.75` Core, not `>=`) | 185/185 | **CONFIRMED** |

---

## Field-by-Field Analysis

Population denominator = **474** unless noted. **Analytics pool** = WTN present = **185**.

### TR Rank

**A. Definition.** Within-pool ranking of TennisRecruiting.net rank (**TRN Rank**). Not the same as TRN Rank (0/430 identical). Sentinel `-1` = this TRN value does not occur among the 180 pool TRN values.

**B. Population.** 430 (90.7%) populated, 44 blank. Of populated: 129 are `-1`; remaining 301 range 1–180.

**C. Inputs.** TRN Rank. Ranking universe = pool rows with both WTN and TRN (n=180). Not class year. Not all 430 TRN rows.

**D. Candidate formula.** Competition rank of TRN Rank among those 180 values (lower TRN = 1). Outside the pool: if that TRN value exists in the pool, copy the pool rank; else `-1`.

**E. Validation.**

| Test | Result |
|---|---|
| Records with TR Rank | 430 |
| Exact matches (pool rank + lookup/`-1`) | **430/430** |
| Rank among all 430 TRN values (excluding `-1`) | **0/301** |
| TR Rank == TRN Rank | **0/430** |
| Duplicate TRN → unique TR Rank | always |

**F. Confidence.** **CONFIRMED** as a rank against the WTN-complete cohort. **UNKNOWN** whether Coda implements `Rank` on a filtered table vs a lookup to another table that is this cohort. Not an external national ranking ID (max = 180 = pool TRN count).

**G. Dependencies.** TRN Rank + pool membership → TR Rank. **Does not feed TR Z.**

**Examples**

| Player | TRN Rank | TR Rank | In pool? | Notes |
|---|---|---|---|---|
| Chase Gerloff | 68 | 15 | yes | better TRN → better TR Rank |
| Alonso Berry | 164 | 108 | yes | |
| Samuel Schumacher | 195 | 140 | yes | |
| Aakash Deodhar | 221 | 166 | yes | |
| Jason Eigbedion | 52 | -1 | no | TRN 52 not in pool TRN set |
| (pool missing TR) Ryu Kotikula | blank | blank | yes | no TR Rank; WS renormalized |

---

### UTR Rank

**A. Definition.** Within-pool ranking of UTR (higher UTR = better).

**B. Population.** 253 (53.4%), including dirty string `Enzo Badotti Cariani` / `10.37 (10.95 doubles)` → UTR Rank `-1`. Numeric UTR: 252. UTR Rank `-1`: 31. Max rank: **185**.

**C. Inputs.** UTR. Universe = 185 pool UTRs, not the 252 numeric UTRs in the sheet.

**D. Candidate formula.** Competition rank of UTR among the pool (higher = 1). Outside the pool: lookup by exact UTR value; else `-1`.

**E. Validation.**

| Test | Result |
|---|---|
| Records with UTR Rank | 253 |
| Pool + lookup/`-1` exact | **253/253** |
| Rank among all numeric UTR (excluding `-1`) | **14/222** |
| Max UTR Rank | 185 (= pool size) |

**F. Confidence.** **CONFIRMED** as pool rank + lookup. **Not** UTR national ranking. **UNKNOWN** filtered-`Rank` vs lookup implementation.

**G. Dependencies.** UTR + pool membership → UTR Rank. **Does not feed UTR Z.**

---

### WTN Rank

**A. Definition.** Ascending competition rank of WTN in the pool. Lower WTN = better.

**B. Population.** 185 (39.0%). Range 1–185. 42 distinct WTN values are duplicated (max multiplicity 11).

**C. Inputs.** WTN among nonblank WTN rows.

**D. Candidate formula.** Competition rank (ties share the minimum rank). Dense rank: **5/185**. Higher-WTN-is-better: **0/185**.

**E. Validation.** **185/185 exact.** n=185, max error 0, MAE 0.

**F. Confidence.** **CONFIRMED.**

**G. Dependencies.** WTN → WTN Rank.

---

### TR Z

**A. Definition.** Standardized **TRN Rank** vs the **pool**, inverted so a better (lower) TRN → positive Z. Computed for every row with TRN Rank (including non-pool), using **pool** moments.

**B. Population.** 430 (90.7%). Blank iff TRN Rank is blank (44).

**C. Inputs.** TRN Rank. μ, s from pool TRN only (n=180). **Sample** SD. Rounded to 2 decimals.

**Intended:** `(Mean TRN − Player TRN) / SD` — **matches**, with pool moments.

**D. Candidate formula.**

```
TR Z = round( (147.272222 − TRN Rank) / 52.931476 , 2 )
```

**E. Validation.**

| Population / SD | n | exact | ≤0.001 | ≤0.01 | max abs | MAE |
|---|---|---|---|---|---|---|
| Pool TRN, sample SD, inverted | 430 | **430** | 430 | 430 | 0 | 0 |
| Pool TRN, population SD | 430 | 280 | 280 | 405 | 0.06 | 0.0046 |
| All TRN in workbook, sample SD | 430 | 4 | 4 | 6 | 14.5 | 1.17 |
| Using **TR Rank** instead of TRN Rank | 301 | 24 | 24 | 73 | 1.17 | 0.032 |
| Class 2027-only moments | 430 | 9 | 9 | 34 | 1.38 | 0.12 |
| Non-inverted sign | — | 0 | — | — | — | — |

**F. Confidence.** **CONFIRMED.** Matches intended TR convention. Population is the WTN-complete cohort, not all recruits. Outliers were not trimmed.

**G. Dependencies.** TRN Rank + pool TRN moments → TR Z.

**Examples**

| Player | TRN Rank | TR Z |
|---|---|---|
| (best in pool TRN) | low TRN | high positive Z |
| Chase Gerloff | 68 | (μ−68)/s ≈ +1.50 |
| Alonso Berry | 164 | −0.32 |
| Samuel Schumacher | 195 | −0.90 |
| Aakash Deodhar | 221 | −1.39 |

---

### UTR Z

**A. Definition.** Standardized UTR vs pool (higher UTR → higher Z). Numeric UTR only.

**B. Population.** 252 (53.2%). Dirty UTR string has no UTR Z.

**C. Inputs.** UTR. μ, s from 185 pool UTRs. Sample SD.

**Intended:** `(Player UTR − Mean UTR) / SD` — **matches**, with pool moments.

**D. Candidate formula.**

```
UTR Z = round( (UTR − 10.835243) / 0.445188 , 2 )
```

**E. Validation.**

| Test | n | exact | ≤0.01 | max abs | MAE |
|---|---|---|---|---|---|
| Pool UTR, sample SD, non-inverted | 252 | **252** | 252 | 0 | 0 |
| Inverted | 252 | 0 | 0 | 8.02 | 1.85 |
| All-UTR sample SD | 252 | 1 | 4 | 0.66 | 0.24 |
| Class 2027-only | 252 | 15 | 35 | 0.23 | 0.055 |

**F. Confidence.** **CONFIRMED.**

**G. Dependencies.** UTR + pool UTR moments → UTR Z.

---

### WTN Z

**A. Definition.** Standardized WTN vs pool, **inverted** so lower (better) WTN → positive Z.

**B. Population.** 185 (39.0%). Mean of exported WTN Z ≈ 0.

**C. Inputs.** WTN. μ, s from 185 WTN values. Sample SD.

**D. Candidate formulas tested.**

```
A (original write-up):  (Player WTN − Mean WTN) / SD     → 0/185
B (observed Coda):      (Mean WTN − Player WTN) / SD     → 185/185
```

```
WTN Z = round( (22.391351 − WTN) / 1.318485 , 2 )
```

**E. Validation.**

| Test | n | exact | max abs | MAE |
|---|---|---|---|---|
| B inverted, pool sample SD | 185 | **185** | 0 | 0 |
| A non-inverted | 185 | 0 | 6.50 | 1.64 |
| Population SD | 185 | 140 | — | — |
| Class 2027-only inverted | 185 | 4 | 0.22 | 0.062 |

**F. Confidence.** **CONFIRMED** for **current Coda behavior**. Conflicts with the originally written WTN Z formula. Do not silently “fix.”

**G. Dependencies.** WTN + pool WTN moments → WTN Z.

---

### Weighted Score

**A. Definition.** Combined **rank-space** score on the pool. Lower = better.

**B. Population.** 185 (39.0%). Blank outside the pool.

**C. Inputs.** TR Rank, UTR Rank, WTN Rank. Five pool rows have **blank** TR Rank (not `-1`); those still have Weighted Score via renormalization.

**D. Candidate formula.**

```
if TR Rank present:
  0.30 × TR Rank + 0.40 × UTR Rank + 0.30 × WTN Rank
else:
  (0.40 × UTR Rank + 0.30 × WTN Rank) / 0.70
```

**E. Validation.** n=185 populated Weighted Score.

| Comparison | exact | ≤0.001 | ≤0.01 | max abs | MAE |
|---|---|---|---|---|---|
| vs `round(pred, 2)` | 71 | 71 | 154 | **0.06** | 0.00924 |
| vs unrounded pred | 53 | 68 | 154 | 0.06 | 0.00928 |

OLS on 180 three-metric rows ≈ weights `(0.300, 0.399, 0.300)`. Residuals of 0.03–0.06 (Noa Cakaric, Adrian Baerga-Torres, Ethan Chen) are consistent with Coda rounding of intermediates, not different weights.

**F. Confidence.** **HIGH.** Weight structure and renormalization are established. Not CONFIRMED: not all rows match at 0.01.

**G. Dependencies.** TR/UTR/WTN Rank → Weighted Score.

**Examples**

| Player | TR Rank | UTR Rank | WTN Rank | Actual WS | Pred | Abs err |
|---|---|---|---|---|---|---|
| Shaw Akula | 33 | 18 | 31 | 26.41 | 26.40 | 0.01 |
| Maksim Nekrasov | 19 | 40 | 31 | 30.99 | 31.00 | 0.01 |
| Elijah Johnson | 27 | 40 | 23 | 30.99 | 31.00 | 0.01 |
| Ryu Kotikula | — | 39 | 31 | 35.57 | 35.571 | 0.001 |
| Pietro Sagone | — | 27 | 39 | 32.15 | 32.143 | 0.007 |
| Justin Zhang | 67 | 56 | 29 | 51.20 | 51.20 | 0 |
| Dante Chabot | 35 | 53 | 65 | 51.20 | 51.20 | 0 |
| Ethan Chen | 45 | 16 | 168 | 70.35 | 70.30 | 0.05 |
| Alonso Berry | 108 | 112 | 108 | 109.60 | 109.60 | 0 |
| Noa Cakaric | 129 | 51 | 172 | 110.76 | 110.70 | 0.06 |
| Yusaku Harashima | — | 152 | 100 | 129.68 | 129.714 | 0.034 |
| Samuel Schumacher | 140 | 146 | 110 | 133.39 | 133.40 | 0.01 |

---

### Composite Rank

**A. Definition.** Order of Weighted Score in the pool. 1 = best (lowest Weighted Score).

**B. Population.** 185 (39.0%).

**C. Inputs.** Weighted Score only. Ranking Composite Z instead: poor fit (~49/185).

**D. Candidate formula.** Ascending rank of Weighted Score. Competition rank (`RANK.EQ`) fits **184/185**. Dense rank fails. Name-then-ordinal fails.

**E. Validation.** Displayed Weighted Score ties:

| Players | Displayed WS | Unrounded 30/40/30 | Composite Rank | Pattern |
|---|---|---|---|---|
| Maksim Nekrasov, Elijah Johnson | 30.99, 30.99 | 31.00, 31.00 | **27, 27** | shared (competition) |
| Justin Zhang, Dante Chabot | 51.2, 51.2 | **51.20, 51.20** | **51, 52** | consecutive |

The 51.2 split is **not** hidden precision in the 30/40/30 mix (both exact 51.20). Created-on and name order do not explain 51 vs 52. Tie-break rule **cannot** be recovered from this export.

**F. Confidence.** **HIGH** that Composite Rank is the pool ranking of Weighted Score (lower better). **PARTIAL** on exact tie-breaking.

**G. Dependencies.** Weighted Score → Composite Rank.

---

### Composite Z

**A. Definition.** Combined **z-space** strength. Higher = better. Parallel to Weighted Score. **Not** a z-score of Weighted Score.

**B. Population.** 185 (39.0%).

**C. Inputs.** TR Z, UTR Z, WTN Z. Better match if component Z is computed **unrounded**, mixed, then rounded.

**D. Candidate formula.**

```
if TR Z present:
  round(0.30×TRZ + 0.40×UTRZ + 0.30×WTNZ, 2)
else:
  round((0.40×UTRZ + 0.30×WTNZ) / 0.70, 2)
```

**E. Validation.**

| Mix source | n | exact after round2 | ≤0.01 | max abs | MAE |
|---|---|---|---|---|---|
| Unrounded component Z, then round | 185 | **183** | 185 | 0.01 | 0.00011 |
| Displayed (already rounded) Z, then round | 185 | 162 | 185 | 0.01 | 0.00124 |

Off-by-0.01: Ryan Wang (−0.33 vs −0.325→−0.32), Gianluca Galasso (−0.03 vs −0.025→−0.02).

**F. Confidence.** **HIGH.**

**G. Dependencies.** TR/UTR/WTN Z → Composite Z.

---

### Reliability

**A. Definition.** Match-volume credibility, 0–1, cap at 30 matches.

**B. Population.** 185 (39.0%). 156 are 1.00. Six pool rows have **blank** Matches Played and Reliability **1.00**. Matches Played is never filled outside the pool.

**C. Inputs.** Matches Played only.

**D. Candidate formula.**

```
raw = 1 if Matches Played is blank else min(Matches Played / 30, 1)
displayed Reliability = round(raw, 2)
```

Use **raw** (unrounded) in Adjusted TR Rank / Reliability Score.

**E. Validation.** Displayed vs `round(min(m/30,1),2)` with blank→1: **185/185 exact.**

**Examples:** 0→0.00, 6→0.20, 10→0.33, 14→0.47, 16→0.53, 29→0.97, 30+→1.00, blank→1.00.

**F. Confidence.** **CONFIRMED** for displayed values. Blank-matches→1 may be Coda `IfBlank` / missing WTN-match data rather than a designed “unknown = fully reliable” rule — flag for David.

**G. Dependencies.** Matches Played → Reliability.

---

### Adjusted TR Rank

**A. Definition.** Reliability-shrunk TR Rank toward baseline **90.48**.

**B. Population.** 430 (90.7%) — **exactly when TR Rank is populated.** Blank when TR Rank is blank (44), including the five pool rows with no TR.

**C. Inputs.** TR Rank, unrounded Reliability, 90.48.

**D. Candidate formula.**

```
Rel = min(Matches Played / 30, 1)   # 1 if matches blank
center = 90.48
if TR Rank is blank:
  Adjusted TR Rank = blank
else if row not in pool or TR Rank = -1:
  Adjusted TR Rank = 90.48
else:
  Adjusted TR Rank = TR Rank × Rel + 90.48 × (1 − Rel)
```

When Rel=1: Adj = TR Rank (156 pool rows). When Rel=0 (Alonso Berry, 0 matches): 90.48.

**E. Validation.** Using unrounded Rel vs exported Adj: two pool rows (Aakash Deodhar, Shaw Akula) differ by **0.006** from half-up rounding (113.136 vs 113.13; 63.656 vs 63.65). Using **displayed** Reliability for Shaw is worse (63.46 vs 63.65). Non-pool populated Adj values are **all 90.48**.

**90.48 origin:** `round(mean(TR Rank of 180 pool members with TRN), 2)` = `round(90.47778, 2)` = **90.48**. Median ≈ 90.5. Mean of all non-`-1` TR Rank in the workbook = **82.70** (not 90.48). Export **cannot prove** live `Average()` vs typed constant vs another table.

**F. Confidence.** **HIGH** for the shrink formula. **UNKNOWN** whether 90.48 is live average vs constant.

**G. Dependencies.** TR Rank + Reliability + 90.48 → Adjusted TR Rank.

---

### Reliability Score

**A. Definition.** Weighted Score with Adjusted TR Rank replacing TR Rank. Equals Weighted Score when Rel=1 (156/185).

**B. Population.** 185 (39.0%). For the five rows with blank Adj TR Rank, Reliability Score equals the renormalized Weighted Score (UTR+WTN only).

**C. Inputs.** Adjusted TR Rank (when present), UTR Rank, WTN Rank.

**D. Candidate formula.** Same 30/40/30 mix (and TR-missing renormalization) as Weighted Score.

**E. Validation.** Residual pattern matches Weighted Score (max ~0.06). Alonso Berry: WS 109.60 vs RS 104.34 because Adj 90.48 ≠ TR Rank 108.

**F. Confidence.** **HIGH.**

**G. Dependencies.** Adjusted TR Rank + UTR Rank + WTN Rank → Reliability Score.

---

### Tier

**A. Definition.** Band of Composite Z. Labels: `1 - Elite`, `2 - Strong`, `3 - Core`, `4 - Fringe`, `5 - Long Shot`. **Not** Composite Rank. **Not** Priority (Priority uses overlapping labels but matches Tier on **1/110** pool rows where Priority is filled).

**B. Population.** 185: Core 93, Fringe 37, Strong 34, Elite 12, Long Shot 9.

**C. Inputs.** Composite Z.

**D. Candidate formulas.**

Prompt (`>= -0.75` → Core): **184/185**. Miss: **Samuel Schumacher**, Composite Z **−0.75**, exported **4 - Fringe**.

Observed bands (**185/185** on displayed Composite Z **and** on unrounded Composite Z):

```
if Composite Z >=  1.50 → 1 - Elite
else if Composite Z >=  0.75 → 2 - Strong
else if Composite Z >  -0.75 → 3 - Core
else if Composite Z >  -1.50 → 4 - Fringe
else → 5 - Long Shot
```

Edges: Elite min 1.51; Strong 0.75–1.46; Core −0.70–0.72; Fringe −1.46–**−0.75**; Long Shot ≤ −1.53.

**E. Validation.** Observed formula 185/185. Unrounded vs rounded Composite Z does not change any tier in this export except that the −0.75 Fringe case is already on the displayed value.

**F. Confidence.** **CONFIRMED** for observed bands. The prompt’s `>= -0.75` Core rule is **one-row wrong**.

**G. Dependencies.** Composite Z → Tier.

**Examples**

| Player | Composite Z | Tier |
|---|---|---|
| Jaidyn Finley (Elite set) | ≥1.51 | 1 - Elite |
| Maksim Nekrasov | 1.02 | 2 - Strong |
| Shaw Akula | 1.12 | 2 - Strong |
| Justin Zhang | 0.65 | 3 - Core |
| Alonso Berry | −0.30 | 3 - Core |
| Samuel Schumacher | **−0.75** | **4 - Fringe** |
| Aakash Deodhar | −1.17 | 4 - Fringe |
| Ethan Sun / Long Shot set | ≤ −1.53 | 5 - Long Shot |

---

## Dependency Graph

Corrected from the prompt’s example. **TR Rank does not produce TR Z. UTR Rank does not produce UTR Z.**

```
TRN Rank ──┬── TR Rank ──┐
           │             ├── Weighted Score ── Composite Rank
           └── TR Z ──┐  │
                      │  │
UTR ───────┬── UTR Rank ─┤
           │             │
           └── UTR Z ──┐ │
                       │ │
WTN ───────┬── WTN Rank ─┘
           │
           └── WTN Z ────── Composite Z ── Tier

Matches Played ── Reliability (raw = min(m/30,1); blank m → 1)
                       │
                       ▼
                 Adjusted TR Rank  (shrink toward 90.48; blank if TR Rank blank)
                       │
                       ▼
                 Reliability Score  (30/40/30 using Adj TR Rank)

Pool (WTN present) defines:
  • rank universes for TR / UTR / WTN Rank
  • means and sample SDs for TR / UTR / WTN Z
  • who receives Weighted Score, Composite Rank, Composite Z, Reliability, Reliability Score, Tier
```

**Reliability Score does not determine Tier.** Tier is Composite Z only.

Financial fields (Preread, Preread $, Getability) and Priority **do not** enter these formulas.

---

## Confirmed Formulas

1. Pool = WTN present (185).  
2. WTN Rank = competition rank of WTN, lower better.  
3. TR Rank / UTR Rank = competition ranks **in that pool**, plus value lookup / `-1` outside it.  
4. TR Z / UTR Z / WTN Z = sample-SD z-scores from **pool** moments, 2-decimal rounding; TR and WTN inverted.  
5. Reliability displayed = `round(min(Matches/30, 1), 2)` (blank matches → 1).  
6. Tier = Composite Z bands with Core using **strict** `> -0.75` (Fringe includes −0.75).

---

## High-Confidence Reconstructions

1. Weighted Score = 30/40/30 mix of TR/UTR/WTN Rank, renormalized if TR missing.  
2. Composite Z = 30/40/30 mix of TR/UTR/WTN Z, same renormalization, preferably from unrounded Z.  
3. Composite Rank = ranking of Weighted Score (lower better).  
4. Adjusted TR Rank = `TR×Rel + 90.48×(1−Rel)` with unrounded Rel.  
5. Reliability Score = Weighted Score formula using Adjusted TR Rank.  
6. 90.48 **equals** rounded mean pool TR Rank; live vs constant is unproven.  
7. Phone E164, Days Since Contact, Days Since Text, Awaiting Reply Days are operational calculated fields (see blueprint).

---

## Unknown / Cannot Recover From Export

1. Coda filter / process that fills WTN for these 185 rows.  
2. Whether 90.48 is `Average(TR Rank)` of that filter, a constant, or another table.  
3. Exact Coda `Round` / rank internals behind Weighted Score ±0.06 residuals.  
4. Composite Rank tie-break when Weighted Score is equal (27/27 vs 51/52).  
5. Whether TR/UTR Rank are `Rank` on a filtered view or a lookup.  
6. Original Coda formulas (values only).  
7. Whether Z moments are live or frozen-at-values-that-match-today.  
8. Why blank Matches Played → Reliability 1.  
9. Why `International` is `0` for every row, including Japan / Thailand / Italy.  
10. Meaning of Coda button columns exported as `model` / `system`.

---

## Discrepancy: current Coda vs intended recruiting logic

| Topic | Intended (stated) | Observed in export |
|---|---|---|
| Higher Z = better | Yes | Yes for TR, UTR, and WTN |
| TR Z | `(mean TRN − player TRN) / SD` | **Matches**, using **pool** TRN moments + sample SD |
| UTR Z | `(player UTR − mean UTR) / SD` | **Matches**, using **pool** UTR moments + sample SD |
| WTN Z | `(player WTN − mean WTN) / SD` | **Does not match.** Coda uses `(mean WTN − player WTN) / SD` |
| Z / rank population | Unspecified / “the recruiting pool” | **WTN-complete cohort (185)**, not all 474 rows |
| Tier at −0.75 | `>= -0.75` → Core | **−0.75 → Fringe** (Core is `> -0.75`) |

No formulas were changed. This document only records current Coda behavior.

---

## Questions for David

See `BP-043A_RECRUITING_DATA_BLUEPRINT.md` for the structured question list (only items the workbook cannot answer).
