# BP-043E — Class Year Semantics

**Correction to BP-043B / BP-043C / BP-043D.** No Coda import. No production People writes. No commit in this milestone unless later approved.

## Rule

| Field | Meaning | Source |
|---|---|---|
| `Person.classYear` (`production_people.class_year`) | **College** graduation year at Denison | Roster / Denison, never Coda Class Year |
| `RecruitProfile.recruitClassYear` (`recruit_profiles.recruit_class_year`) | **High school** graduation / recruiting class | Coda `Class Year` |

Example that is **not** a conflict:

- Coda Recruit Class Year = **2026** → `recruitClassYear = 2026`
- Denison Player Class Year = **2030** → `classYear = 2030`

## Import rules (preview only; not executed)

- **Existing Denison Person:** preserve `Person.classYear`. Write Coda Class Year only to `RecruitProfile.recruitClassYear`.
- **New recruit:** populate `recruitClassYear` from Coda. Do **not** assume Coda Class Year should fill `Person.classYear`. Leave Person class year null until Denison graduation year is known.
- **Coda-to-Coda duplicates:** comparing two Coda Class Year values is valid (both are HS class). Comparing Coda Class Year to Person `classYear` is not.

## Schema finding

BP-043C `recruit_profiles` did **not** have this column. Added in `supabase/migrations/0015_recruit_class_year.sql` (unapplied in this step; file only).

## What still must not happen

- Do not apply 0015 or any import against production in this step.
- Do not rewrite committed `0014_recruit_profiles.sql`.
- Do not treat HS 2026 vs Denison 2030 as a match-blocking conflict.
