# Database Workflow (quick reference)

Canonical guide: [`docs/LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md).  
Field ownership: [`docs/DATA_OWNERSHIP.md`](./DATA_OWNERSHIP.md).  
System of record: [`docs/SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md).

## Promotion order

```
Local Development → Test → Commit → Push → Hosted Development Database
```

| Step | Command / action |
|---|---|
| Local schema change | Author `supabase/migrations/00xx_….sql`; apply with `npx supabase migration up` (preserves data) or intentional `npm run db:reset` |
| Test | Confirm `.env.local` → local; `npm run dev`; verify `/team` |
| Commit | Include the migration (+ seed only if roster snapshot should change) |
| Push | `git push` |
| Hosted | `npm run db:link` (once); `npm run db:push` |

## Command safety (BP-022E)

| Command | Destructive? |
|---|---|
| `npm run db:start` / `db:stop` / `db:status` / `db:env` | **Safe** — no People data rewrite |
| `npm run db:seed-auth` | **Safe** for People — only local auth user |
| `npm run db:seed` | **Partial** — updates provider-synced columns; preserves UTR/WTN/notes |
| `npm run db:generate-seed` / `import:players` | **Safe for DB** — files only until you seed/reset |
| `npm run db:reset` | **DESTRUCTIVE** — destroys all local data |

## Day-to-day (preserve manual edits)

```bash
npm run db:start    # once per machine session if stopped
npm run dev         # edit People freely — values persist in local Postgres
```

Do **not** run `db:reset` unless you intend to wipe local data.

## Refresh roster from sync source (preserve UTR / WTN / notes)

```bash
npm run import:players
npm run db:generate-seed
npm run db:seed          # NOT db:reset
```

## Full local wipe (intentional)

```bash
npm run db:reset
```

Do **not** hand-edit the hosted schema in the SQL Editor for routine work.
Use committed migrations + `db:push`.
