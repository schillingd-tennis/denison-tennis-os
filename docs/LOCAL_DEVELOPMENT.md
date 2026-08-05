# Local Development & Database Workflow (BP-021B)

Local Supabase is the **primary development database**. The hosted Supabase
project is updated only after changes are tested locally, committed, and
pushed — never by ad-hoc SQL edits in the dashboard during feature work.

## Prerequisites

1. **Docker Desktop** running (required by the Supabase CLI local stack).
   Ensure `docker` is on your `PATH` (if needed:
   `export PATH="$HOME/Applications/Docker.app/Contents/Resources/bin:$PATH"`).
2. **Node.js** + project dependencies (`npm install`).
3. Supabase CLI via the project dependency (`npx supabase` / `npm run db:*`).

This repository pins the CLI as a devDependency (`supabase` in
`package.json`). Prefer `npm run db:…` scripts over a global install.

Quick reference: [`docs/DATABASE_WORKFLOW.md`](./DATABASE_WORKFLOW.md).

## Developer dashboard

In the app: **Settings → Developer** (`/settings/developer`).

Shows the current Local / Hosted environment, Supabase URL, migration and
seed versions, People role counts, Docker / local Supabase status, and
developer utilities (reset DB, re-run seed, migration history, Studio link,
copy env info). Destructive actions only run against a **local** stack in
`next dev`.

## Quick start

```bash
# 1. Start Docker Desktop, then:
npm run db:start
# Also seeds the local auth user (see Local authentication below).

# 2. Reset DB = apply all migrations + seed.sql + re-seed local auth
npm run db:reset

# 3. Print values for .env.local
npm run db:env

# 4. Put those two lines into .env.local, then:
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) (or `:3001` if
that port is in use). Sign in with the local development credentials below,
then open Team — you should see players, alumni, and coaches (including David
Schilling / Andy Mackler) with roles and titles.

## Local authentication

Hosted Supabase auth users are **not** copied into the local stack. After
`db:start` or `db:reset`, seed a development-only login with the Auth Admin API
(GoTrue) — never by inserting into `auth.users` by hand:

```bash
npm run db:seed-auth
```

`npm run db:start` and `npm run db:reset` already run this automatically.

| Field | Value |
|---|---|
| Email | `schillingd@denison.edu` |
| Password | `ChangeMe123!` |

These credentials are **local development only**. Do not use them on the hosted
project. The seed script refuses to run if Supabase is not on
`127.0.0.1` / `localhost`.

If login fails with “Invalid email or password” after a reset, run
`npm run db:seed-auth` again (or `npm run db:reset`).

## Environment variables

| Variable | Local value source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `npm run db:env` → `API_URL` (usually `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `npm run db:env` → `ANON_KEY` |

Copy the printed lines into `.env.local` (gitignored). Restart `npm run dev`
after changing env vars.

Example file checked into the repo: [`.env.local.example`](../.env.local.example).

**Do not point day-to-day feature work at the hosted project.** Keep hosted
updates for the promote step below.

## npm scripts

| Script | Purpose |
|---|---|
| `npm run db:start` | Start local Supabase (Docker), then seed local auth user |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:status` | Show local URLs / keys / health |
| `npm run db:reset` | Drop local DB, re-apply **all** migrations, run `seed.sql`, seed local auth |
| `npm run db:seed-auth` | Create/reset the local development login via Auth Admin API |
| `npm run db:generate-seed` | Regenerate `supabase/seed.sql` from `src/features/people/data.ts` |
| `npm run db:env` | Print `.env.local` lines for the running local stack |
| `npm run db:link` | Link CLI to the hosted project (one-time; needs DB password) |
| `npm run db:push` | Push pending migrations to the **linked hosted** project |
| `npm run import:players` | Re-import Airtable CSV → `data.ts` (then regenerate seed) |

## Migration workflow

### Where migrations live

`supabase/migrations/*.sql` — ordered by filename prefix:

1. `0001_create_production_people.sql`
2. `0002_allow_authenticated_update_production_people.sql`
3. `0003_people_roles_and_coaches.sql`
4. `0004_seed_coach_people.sql`
5. `0005_grant_production_people_privileges.sql` (Data API grants for `anon` / `authenticated`)

The CLI records applied migrations in the local database. `npm run db:reset`
always starts clean and applies every file.

### Day-to-day order (required)

```
Local Development
  → Test
  → Commit
  → Push
  → Hosted Development Database
```

1. **Local Development** — write a new migration under `supabase/migrations/`.
   Apply with `npm run db:reset` (or `npx supabase migration up` on an already
   running local DB).
2. **Test** — run the app against local Supabase (`npm run db:env` → `.env.local`,
   then `npm run dev`). Confirm schema + data behavior.
3. **Commit** — include the migration SQL (and seed updates if needed).
4. **Push** — push the branch/commit to git.
5. **Hosted Development Database** — promote with the CLI (not the SQL Editor
   for routine work):

   ```bash
   # One-time per machine/project:
   npm run db:link
   # Enter the hosted project ref + database password from
   # Supabase Dashboard → Project Settings → Database.

   # After link, whenever migrations are ready to promote:
   npm run db:push
   ```

`db:push` applies **only pending migrations** to the linked remote. It does
not re-run seeds. To refresh hosted **data**, run `supabase/seed.sql` in the
hosted SQL Editor deliberately (or a future data sync job) — do not treat the
dashboard as the schema source of truth.

## Seed workflow

1. Update People data via Airtable import when needed:

   ```bash
   npm run import:players
   ```

2. Regenerate SQL seed:

   ```bash
   npm run db:generate-seed
   ```

3. Load into local DB:

   ```bash
   npm run db:reset
   ```

`supabase/config.toml` enables seeding with:

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

The seed upserts all current People (players, alumni, coaches) including
roles, titles, D#, and status. Coach stable ids:

- `person-david-schilling` (Head Coach)
- `person-andy-mackler` (Assistant Coach)

## Reset the local database

```bash
npm run db:reset
```

This destroys local data, re-applies every migration, and runs `seed.sql`.
Safe and expected during development.

To fully tear down containers:

```bash
npm run db:stop
# or: npx supabase stop --no-backup
```

## Promote schema changes to hosted Supabase

| Do | Don’t |
|---|---|
| Author migrations in `supabase/migrations/` | Hand-edit hosted schema in the dashboard |
| Test with `npm run db:reset` locally | Apply untested SQL only on hosted |
| `npm run db:push` after commit/push | Skip local verification |
| Keep hosted seed refreshes explicit | Assume `db:push` reloads seed data |

### First-time link

```bash
npm run db:link
```

Use the project ref from the hosted URL
(`https://<project-ref>.supabase.co`) and the database password from the
Supabase dashboard.

### Ongoing promote

```bash
npm run db:push
```

Confirm the CLI reports which migrations will be applied before accepting.

### Repairing a previously hand-edited hosted DB

If the hosted database was changed manually (e.g. missing `0003` / `0004`):

1. Prefer bringing it in line with `db:push` once linked (CLI applies pending
   files it has not recorded remotely).
2. If history is confused, use `npx supabase migration list` (local vs remote)
   and Supabase’s migration repair docs — still avoid inventing schema in the
   SQL Editor outside of committed migration files.

## Verification checklist

After `db:reset` + pointing `.env.local` at local:

```bash
npm run db:status
npm run db:env
# Query via Studio (printed by db:status) or:
npx supabase db lint
```

Confirm:

- [ ] `roles` and `title` columns exist on `production_people`
- [ ] `person-david-schilling` and `person-andy-mackler` exist
- [ ] Row count matches seed (currently 40 People)
- [ ] `/team` loads; Coaches filter shows David + Andy
- [ ] No pending migrations (`migration list` local = remote after push)

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: command not found` | Install/start Docker Desktop; ensure `docker` is on `PATH` |
| `db:start` hangs / unhealthy | Restart Docker Desktop; `npm run db:stop` then `db:start` |
| App still shows old hosted data | `.env.local` still points at hosted URL — run `npm run db:env` and replace |
| Seed missing coaches | Regenerate seed (`db:generate-seed`) then `db:reset` |
| `db:push` unauthorized | Re-run `db:link` with the database password |

## Related docs

- [`docs/DATA_MODEL.md`](./DATA_MODEL.md) — Person / roles model
- [`docs/DECISIONS.md`](./DECISIONS.md) — BP-021 / BP-021B decisions
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — repository boundaries
