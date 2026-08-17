# BP-045 — Recruiting Directory & Workspace Foundation

**Status:** First Recruiting UI. No Communication, Scouting, import, or scoring-model changes.  
**Sources:** [`BP-043B_RECRUITING_DATA_ARCHITECTURE.md`](./BP-043B_RECRUITING_DATA_ARCHITECTURE.md), [`BP-043C_RECRUITING_SCHEMA.md`](./BP-043C_RECRUITING_SCHEMA.md), [`BP-044_RECRUITING_ANALYTICS_ENGINE.md`](./BP-044_RECRUITING_ANALYTICS_ENGINE.md).

One Person identity. Recruit Profile holds recruiting classification. BP-044 analytics are computed at read time and are **not** Person or Recruit Profile columns.

---

## 1. Surfaces

| Route | Behavior |
|---|---|
| `/recruiting` | Directory of **current** recruits: Person role `recruit` and a Recruit Profile. |
| `/recruiting/[id]` | Same Person record as Team. Recruiting context: profile + analytics (current cohort) or historical profile (Players). |

Team (`/team`, `/team/[id]`) is unchanged aside from shared lifecycle revalidation.

---

## 2. Directory

Copied Team directory shell (`SearchInput`, `ViewToggle`, `DirectoryTable`, found-set copy/export). Recruiting directory chrome is **local** (not Team’s `Toolbar` + `FilterChipGroup`).

**Membership:** Person role `recruit` **and** a Recruit Profile. Historical profiles on Players are not listed here; open `/recruiting/[id]` (or Team) to see them.

**Page hierarchy:** title + “Current recruits” + Add Recruit → four KPI cards → search/view row → compact facet menus → directory table.

**KPI cards** (cohort + history, not the found-set): Total Recruits (current role=recruit + profile), Priority 1 Recruits (coach Priority Elite / `1 - Elite`), Commits (Outcome = Committed to Denison, including historical profiles on Players), Need Attention (`—` until Communication exists). Analytics Tier is not a directory KPI.

**Columns:** Name (primary + Class of year · hometown), Pipeline, Priority, Interest, UTR, TRN, WTN, Actions. UTR / WTN / TRN are Person tennis **facts**. Pipeline / Priority / Interest are Recruit Profile lookups. Analytics Tier is not a list column.

**List interaction** (OS directory standard): the row is not a navigation target. Name/avatar opens the Recruit workspace. Pipeline, Priority, Interest, UTR, TRN, and WTN edit inline (`InlineEditCell`, click to edit). Actions keep Call / Text / Email. Tennis-fact edits persist on Person and recompute BP-044 analytics in memory for the cohort; lookup edits persist on Recruit Profile.

**Filters** (OR within a category, AND across; persisted; All clears every facet): Recruit Type, Pipeline, Interest, Outcome, Priority, Getability, Recruit Class Year. Each facet is a compact dropdown button on one row. No Board view.

**Add Recruit:** shared `AddPersonFlow` with `role=recruit`. Creates Person + empty Recruit Profile. Optional Recruit Class Year (not Denison `Person.classYear`).

**Delete:** same `DeletePersonConfirm` / `deletePersonAction`. Returns to `/recruiting`. Profile cascades in the database.

---

## 3. Recruit Workspace

BP-036D split: Workspace Navigation left, Adaptive Workspace right.

| Workspace | Content |
|---|---|
| Recruiting | Recruit Profile classification, evaluation, academic, admissions, intelligence |
| Analytics | Read-only BP-044 results for this Person vs the recruiting WTN pool |
| Contact | Existing Person Contact Information workspace |

PersonHeader + Tennis Performance `OverviewPanel` show identity and raw UTR/WTN. No second Person. No Communication or Scouting workspaces.

Default selected workspace is **Recruiting**.

---

## 4. UX / design decisions

- Recruiting directory chrome is local: KPI summary row, compact facet menus, semantic pills. Do not push that treatment into Team.
- Recruiting filters are compact and local. Do not change Team’s filter chip tracks to fit Recruiting’s seven facets.
- Recruiting List follows the OS directory interaction standard (lists work in place; workspaces are for depth). See `docs/DECISIONS.md`.
- Do not add Recruiting nav items to Team Person Workspace.
- Header status/role are display-only here so Team remains the place for Player/Coach header editing.

### Historical Recruit Profiles vs current analytics cohort

1. **Historical Recruit Profiles** — A Person who is now a Player (or other non-recruit role) may still have a Recruit Profile from import. Those rows are **kept**. They are not deleted and they are not rewritten. The Recruit Workspace at `/recruiting/[id]` still opens the profile.

2. **Current recruiting analytics cohort** — BP-044 formulas are unchanged. The engine is called only on People who currently have **role = recruit** and a Recruit Profile. The WTN pool is WTN-present **inside that set** (185 on the imported Coda recruits). Roster Players with WTN must not enter the live pool.

---

## 5. Out of scope

Communication, Scouting, tournament lists, changing BP-044 formulas, importing data, persisting analytics columns.
