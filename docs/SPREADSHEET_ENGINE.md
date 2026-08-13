# Spreadsheet Engine (BP-038A)

Architecture foundation for every future spreadsheet / grid in Denison Tennis
OS. **This milestone ships no visible UI** — only types, catalog bridging,
saved-view presets, filter/sort/export models, and this document.

Implementation: `src/features/spreadsheet-engine/`.

---

## 1. Design goals

One engine must eventually power:

- unlimited / configurable columns
- saved views
- sorting (single + multi-column)
- filtering
- grouping (future)
- CSV export (now modeled) and Excel export (future)
- bulk editing (future — via Field Engine editors)
- search
- AI queries

…without each module inventing its own column or export definitions.

---

## 2. Single source of truth — Field Catalog

For Person data, **`src/features/people/fieldCatalog.ts` is the only place
fields are defined.**

The Spreadsheet Engine **projects** catalog metadata into spreadsheet shapes.
It does **not** redefine labels, types, enums, sensitivity, or capabilities.

| Spreadsheet need | Catalog source |
|---|---|
| Column title | `label` |
| Field id | `key` |
| Data type | `type` |
| Formatter | derived from `type` |
| Editor type | derived from `type` + `editable` |
| CSV label | `csvLabel` ?? `label` |
| Searchability | `searchable` (or derived default) |
| Sortable | `sortable` |
| Filterable | `filterable` |
| Exportable | `exportable` |
| Sensitive | `sensitive` |
| Default width | `defaultWidth` (or type default) |
| Default alignment | `defaultAlign` (or type default) |

Bridge: `personFieldToColumnDefinition` / `resolvePersonSpreadsheetView` in
`columnFromCatalog.ts`.

Future domains (Recruit, Equipment, …) will register their own catalogs and
provide a parallel bridge — still one engine.

---

## 3. Core models

| Type | Role |
|---|---|
| `ColumnDefinition` | Resolved, catalog-backed column (title, type, formatter, editor, capabilities). |
| `SpreadsheetColumn` | View-local instance: order, hidden, pinned, frozen, width/align overrides. |
| `ColumnGroup` | Named groups of field ids (e.g. Travel Documents). |
| `SavedView` | Named configuration: columns, groups, filters, sorts, search, roles. |
| `SpreadsheetView` | Runtime: `SavedView` + resolved `ColumnDefinition[]`. |
| `ExportDefinition` | Reusable export plan: fields, order, sensitive/hidden policy, format, filename, scope. |
| `SpreadsheetFilter` | Field + operator + value(s). |
| `SpreadsheetSort` | Field + `asc` \| `desc` (array = multi-column priority). |

Aliases / deliverable names from the milestone map directly onto these types
(`SpreadsheetView`, `SavedView`, `ColumnDefinition`, `ColumnGroup`,
`ExportDefinition`, `SpreadsheetColumn`).

---

## 4. How every future module will consume it

```
Domain Field Catalog  (Person today)
        ↓
Spreadsheet Engine bridge  (ColumnDefinition)
        ↓
SavedView / SpreadsheetView  (columns, filters, sorts)
        ↓
┌───────────────┬────────────────┬──────────────────┐
│ Grid UI       │ CSV / Excel    │ Search / AI      │
│ (future)      │ exporter       │ planners         │
└───────────────┴────────────────┴──────────────────┘
        ↓
Field Engine (cell display / edit / save)  — BP-037
        ↓
Person repository / updatePersonAction
```

Rules for modules (Team, Recruiting, Coaches, Alumni, Staff, …):

1. **Never** hard-code column title lists for Person fields.
2. Pick field ids from the catalog; resolve with
   `resolvePersonSpreadsheetView` or `getPersonColumnDefinition`.
3. Persist user custom views as `SavedView` documents (storage later).
4. Cell editing goes through the **Field Engine**, not a second editor stack.
5. Found-set / directory UI may keep using today’s table until a later
   milestone migrates it onto this engine — no regression in BP-038A.

---

## 5. Saved views

Built-in Person presets (architecture constants, no UI):

| View | Id | Purpose |
|---|---|---|
| Roster View | `people.roster` | Default team roster |
| Recruiting View | `people.recruiting` | Prospect-oriented Person columns |
| Travel Manifest | `people.travel_manifest` | Travel / identity logistics |
| Admissions View | `people.admissions` | Enrollment / identity |
| Academics View | `people.academics` | Program of study |
| Custom View | `kind: "custom"` | Via `createCustomPersonView` |

Future:

- user-authored custom views
- role-specific defaults (`roleKeys`)
- per-user last-opened view
- pinned / frozen / width persistence on `SpreadsheetColumn`

---

## 6. CSV / export architecture

`ExportDefinition` captures:

- which columns (`fieldIds` in order)
- include hidden fields
- include sensitive fields
- value formatting (`display` vs `raw`)
- filename
- export scope (`found_set` \| `current_view` \| `selection` \| `all_matching_filters`)
- format (`csv` now; `xlsx` reserved)

Build from a view:

```ts
import {
  TRAVEL_MANIFEST_VIEW,
  exportDefinitionFromSavedView,
  resolveExportColumns,
} from "@/features/spreadsheet-engine";

const def = exportDefinitionFromSavedView(TRAVEL_MANIFEST_VIEW, {
  format: "csv",
  includeSensitiveFields: false,
});
const columns = resolveExportColumns(def);
// columns[].csvLabel / formatter — catalog-backed only
```

A future exporter iterates rows × `resolveExportColumns(def)` and writes CSV.
It must not invent headers.

---

## 7. Filters

Operators (architecture): `equals`, `not_equals`, `contains`, `starts_with`,
`ends_with`, `before`, `after`, `between`, `empty`, `not_empty`, `in`,
`not_in`, `gt`, `gte`, `lt`, `lte`.

`FILTER_OPERATORS_BY_TYPE` maps each Field Engine / catalog type to allowed
operators. UI and query execution are later milestones.

---

## 8. Sorting

`SpreadsheetSort[]` on a `SavedView`:

- length 1 → single-column sort
- length > 1 → multi-column (array order = priority)
- `direction`: `asc` \| `desc`

`normalizeSorts` drops non-sortable / unknown catalog fields.

---

## 9. Search

`SavedView.searchQuery` is the free-text slot. Global Search and spreadsheet
search should both consult `ColumnDefinition.searchable` (from catalog
`searchable` / derived defaults) so indexing rules stay centralized.

Sensitive / secure fields default to non-searchable unless the catalog
overrides.

---

## 10. Future spreadsheet UI

A later milestone will:

1. Load a `SavedView` (preset or stored).
2. Call `resolvePersonSpreadsheetView`.
3. Render a grid with `visibleColumns`.
4. Use Field Engine `FieldRenderer` (or a grid cell adapter) for display/edit.
5. Apply `filters` / `sorts` / `searchQuery` in the data layer.
6. Offer export via `exportDefinitionFromSavedView`.

Until then, **no navigation entry, no page, no table chrome** is added.

---

## 11. Non-goals (BP-038A)

- No spreadsheet page or route
- No changes to Adaptive Workspace / Person Workspace / Team UI
- No seed / migration for persisted views (presets are code constants)
- No CSV file generation yet (model only)
