# Local Development & Database Workflow (BP-021B / BP-022E)

Local Supabase is the **primary development database**. The hosted Supabase
project is updated only after changes are tested locally, committed, and
pushed — never by ad-hoc SQL edits in the dashboard during feature work.

**BP-022E:** Manual People edits (UTR, WTN, hometown while developing, notes,
…) must persist across normal development. Data is replaced only when you
intentionally reset or re-seed. See [`DATA_OWNERSHIP.md`](./DATA_OWNERSHIP.md)
and [`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md).

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
# Starts local Supabase (keeps existing data if volumes exist).
# Seeds the local auth user only — does NOT reset People data.

# 2. Print values for .env.local (first time / after fresh start)
npm run db:env

# 3. Put those two lines into .env.local, then:
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) (or `:3001` if
that port is in use). Sign in with the local development credentials below,
then open Team.

**Only when you intentionally want a clean database:**

```bash
npm run db:reset   # DESTRUCTIVE — destroys all local People data
```

## Command reference (safe vs destructive)

### Safe (do not rewrite People rows)

| Script | Behavior |
|---|---|
| `npm run db:start` | Starts local Supabase (Docker). Does **not** reset or reseed People. Runs `db:seed-auth` for the login user only. Existing Postgres volumes are kept. |
| `npm run db:stop` | Stops containers; **keeps** data volumes (default). |
| `npm run db:status` | Health / URLs / keys. |
| `npm run db:env` | Prints `.env.local` lines for the running local stack. |
| `npm run db:seed-auth` | Creates/resets the local Auth login via Admin API. Does not touch `production_people`. |
| `npm run db:generate-seed` | Regenerates `supabase/seed.sql` from `data.ts`. **Does not** apply it. |
| `npm run import:players` | Regenerates `src/features/people/data.ts` from CSV. **Does not** touch the database. |
| `npm run db:lint` | SQL lint. |
| `npm run dev` | Next.js app. Does not seed or reset. |
| Browser refresh / git commit / branch checkout | Do not touch the local Postgres volume. |

### Partial (provider-synced columns only)

| Script | Behavior |
|---|---|
| `npm run db:seed` | Applies `supabase/seed.sql` to the **running** local DB. Upserts **provider-synced** columns only (current sync source: Airtable CSV). **Preserves** UTR, WTN, notes, and other app-owned fields. Does **not** drop the database. |

### Destructive

| Script | Behavior |
|---|---|
| `npm run db:reset` | **Destroys** the local database, re-applies **all** migrations, runs `seed.sql`, then `db:seed-auth`. **All** local People data is lost (including UTR, WTN, notes, manual edits). |
| `npx supabase stop --no-backup` | Stops and may discard local DB volumes — treat as destructive. |
| Developer “Reset Local Database” / palette equivalent | Same as `db:reset`. |

### Hosted promote (not for day-to-day People edits)

| Script | Behavior |
|---|---|
| `npm run db:link` | One-time link to hosted project. |
| `npm run db:push` | Pushes **pending migrations** to hosted. Does **not** re-run seed. |

## Recommended day-to-day workflow (never lose manual edits)

```bash
# Morning / after reboot
npm run db:start          # if Supabase isn't already running
npm run dev

# Edit People in the UI (UTR, WTN, hometown while testing, notes, …)
# Values live in local Postgres — they survive:
#   - npm run dev restarts
#   - browser refresh
#   - git commit / checkout
#   - Docker Desktop restart (volumes intact)
#   - npm run db:stop && npm run db:start
```

**Do not** run `db:reset` unless you mean to wipe local data.

When the People sync CSV changes and you want provider-synced roster fields
refreshed **without** losing UTR/WTN/notes:

```bash
npm run import:players
npm run db:generate-seed
npm run db:seed           # preserving upsert — NOT db:reset
```

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

If the app “forgets” local edits, first check that `.env.local` still points at
**local** (`127.0.0.1:54321`), not the hosted project URL.

## Migration workflow

### Where migrations live

`supabase/migrations/*.sql` — ordered by filename prefix:

1. `0001_create_production_people.sql`
2. `0002_allow_authenticated_update_production_people.sql`
3. `0003_people_roles_and_coaches.sql`
4. `0004_seed_coach_people.sql`
5. `0005_grant_production_people_privileges.sql` (Data API grants for `anon` / `authenticated`)

The CLI records applied migrations in the local database.

Prefer applying a **new** migration without wiping data:

```bash
npx supabase migration up
```

Use `npm run db:reset` only when you need a clean schema+data rebuild.

### Day-to-day order (required)

```
Local Development
  → Test
  → Commit
  → Push
  → Hosted Development Database
```

1. **Local Development** — write a new migration under `supabase/migrations/`.
   Prefer `npx supabase migration up` to apply without destroying data.
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
not re-run seeds. To refresh hosted **data**, run seed deliberately — do not
treat the dashboard as the schema source of truth.

## Seed workflow

`supabase/config.toml` enables seeding **on `db reset` only**:

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

`db:start` does **not** re-run `seed.sql` when volumes already exist.

1. Update People file snapshot from the current sync source when needed:

   ```bash
   npm run import:players
   ```

2. Regenerate SQL seed:

   ```bash
   npm run db:generate-seed
   ```

3. Apply without wiping app-owned fields:

   ```bash
   npm run db:seed
   ```

   Or, only if you accept a full wipe:

   ```bash
   npm run db:reset
   ```

Seed upserts update **provider-synced** columns only (BP-022E / BP-023A). Coach stable ids:

- `person-david-schilling` (Head Coach)
- `person-andy-mackler` (Assistant Coach)

## Reset the local database

```bash
npm run db:reset
```

This **destroys** local data, re-applies every migration, and runs `seed.sql`.
Use only when you intentionally want a clean slate.

To stop containers while keeping data:

```bash
npm run db:stop
```

## Promote schema changes to hosted Supabase

| Do | Don’t |
|---|---|
| Author migrations in `supabase/migrations/` | Hand-edit hosted schema in the dashboard |
| Test locally (prefer `migration up` over reset) | Apply untested SQL only on hosted |
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

After pointing `.env.local` at local:

```bash
npm run db:status
npm run db:env
npx supabase db lint
```

Confirm:

- [ ] `.env.local` URL is `http://127.0.0.1:54321` (not hosted)
- [ ] `roles` and `title` columns exist on `production_people`
- [ ] `person-david-schilling` and `person-andy-mackler` exist
- [ ] `/team` loads; Coaches filter shows David + Andy
- [ ] Manual UTR edit survives `npm run db:seed` and `db:stop` / `db:start`
- [ ] No pending migrations (`migration list` local = remote after push)

## Troubleshooting

| Symptom | Fix |
|---|---|
| Manual UTR/WTN/notes disappeared | You likely ran `db:reset`, or an old full-overwrite seed. Confirm you are on BP-022E seed (provider-synced conflict updates only). Avoid reset for day-to-day work. |
| Edits “vanish” after refresh but DB still has them | `.env.local` may point at **hosted** Supabase — run `db:env` and fix. |
| `docker: command not found` | Install/start Docker Desktop; ensure `docker` is on `PATH` |
| `db:start` hangs / unhealthy | Restart Docker Desktop; `npm run db:stop` then `db:start` |
| Seed missing coaches | Regenerate seed (`db:generate-seed`) then `db:seed` (or `db:reset` if you accept a wipe) |
| `db:push` unauthorized | Re-run `db:link` with the database password |

## Related docs

- [`docs/SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md) — long-term SoR architecture
- [`docs/DATA_OWNERSHIP.md`](./DATA_OWNERSHIP.md) — provider vs app field ownership
- [`docs/DATA_MODEL.md`](./DATA_MODEL.md) — Person / roles model
- [`docs/DECISIONS.md`](./DECISIONS.md) — locked decisions including BP-023A
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — repository boundaries
