# Database Workflow (quick reference)

Canonical guide: [`docs/LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md).

## Promotion order

```
Local Development → Test → Commit → Push → Hosted Development Database
```

| Step | Command / action |
|---|---|
| Local | Author `supabase/migrations/00xx_….sql`; `npm run db:reset` |
| Test | `npm run db:env` → `.env.local`; `npm run dev`; verify `/team` |
| Commit | Include migration (+ seed if data changed) |
| Push | `git push` |
| Hosted | `npm run db:link` (once); `npm run db:push` |

## Reset local

```bash
npm run db:reset
```

## Regenerate seed

```bash
npm run import:players   # optional, when Airtable CSV changes
npm run db:generate-seed
npm run db:reset
```

Do **not** hand-edit the hosted schema in the SQL Editor for routine work.
Use committed migrations + `db:push`.
