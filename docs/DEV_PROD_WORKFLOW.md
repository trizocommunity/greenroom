# DEV vs PROD Workflow

End-to-end runbook for the two environments Greenroom actually ships to: a
local machine and `greenroomfestivals.in` (Vercel + Neon Postgres).

> Architecture is documented in detail in `issues/done/neon-database-adoption.md`.
> This doc is the operating manual — what to run, in what order, against what.

---

## 1. Environment shape at a glance

| | Local DEV | Vercel PROD (and previews) |
|---|---|---|
| App runtime | `next dev` on `localhost:3000` | Vercel serverless functions |
| Database | Docker Postgres (`:5433`) **or** a Neon dev branch | Neon `main` branch (per env) |
| ORM / driver | `drizzle-orm/node-postgres` + `pg.Pool` | Same — no serverless HTTP driver |
| Migrations | `drizzle-kit push` against local/Neon branch | Generated SQL files replayed against Neon (target end state) |
| Cron | n/a | Vercel Cron → `/api/v1/cron` (Bearer `CRON_SECRET`) |
| Branching model | One DB, optionally per-dev Neon branch | One Neon `main` branch; Vercel previews get auto-branch via Neon integration |
| Source branch you work on | `develop` (or feature branches) | Built from whatever Vercel is configured to deploy from (`main` for prod) |

The codebase does **not** change between the two — the differences are
entirely in environment variables and what the scripts point at.

---

## 2. Environment variables

Three files, three purposes:

| File | In git? | Purpose |
|---|---|---|
| `.env.example` | Yes | Template — every var the app reads, with docs. Commit changes here. |
| `.env` | **No** (`.gitignore`) | Concrete values for whichever DB you're currently pointing at. Local-only. |
| `.env.local` | **No** | Same purpose as `.env`, kept separate so it isn't accidentally committed when `.env` is. README uses this one. |

`.env.example` documents the vars the app reads:

- **Database** — `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct).
- **Auth** — `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **App** — `NEXT_PUBLIC_APP_URL`.
- **Payments** — `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- **Email** — `RESEND_API_KEY` (optional in dev — see fallback below), `EMAIL_FROM`.
- **Cloudinary** — `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_FESTIVAL_PRESET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Ops** — `CRON_SECRET`.

### Why two database URLs

- `DATABASE_URL` is the **pooled** Neon endpoint (`-pooler.c-XX.aws.neon.tech`,
  PgBouncer transaction-mode). The app uses this at runtime via `pg.Pool` —
  PgBouncer multiplexes connections across serverless function invocations.
- `DATABASE_URL_UNPOOLED` is the **direct** endpoint (`c-XX.aws.neon.tech`).
  `drizzle-kit` issues session-level DDL (`CREATE TABLE`, `ALTER TABLE`, …)
  that PgBouncer's transaction mode refuses, so migrations need the direct
  line. `drizzle.config.ts` reads `DATABASE_URL_UNPOOLED` first.

### Secrets you must generate fresh per environment

```bash
openssl rand -hex 32   # BETTER_AUTH_SECRET, CRON_SECRET
```

Never reuse between dev and prod, and never commit them.

---

## 3. Local DEV workflow

### First-time setup

```bash
pnpm install
cp .env.example .env.local        # or .env — both are gitignored
```

Fill `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and a database URL (next step).

### Pick a database

**Option A — local Docker Postgres** (zero-config, mirrors nothing about prod):

```bash
pnpm db:setup   # docker compose up + db:push + db:seed
pnpm dev
```

Defaults from `.env.example` point at `localhost:5433` → `greenroom` DB. SSL
is auto-disabled (`isLocalConnection` in `src/core/database/connection.ts`).

**Option B — Neon dev branch** (closest mirror of prod):

```bash
neonctl projects create --name greenroom-dev
neonctl connection-string main --pooled       # → DATABASE_URL
neonctl connection-string main                # → DATABASE_URL_UNPOOLED
# paste both into .env.local

pnpm db:push    # apply current schema
pnpm db:seed   # optional: Super Admin + sample festival
pnpm dev
```

### Day-to-day commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start Next dev server on `:3000` |
| `pnpm test` | Vitest (all projects) |
| `pnpm test:unit` | Vitest unit project |
| `pnpm test:integration` | Vitest integration project |
| `pnpm lint` | Biome lint |
| `pnpm format` | Biome format `--write` |
| `pnpm check` | Biome check (lint + format) `--write` |
| `pnpm db:start` / `db:stop` / `db:logs` | Docker Postgres lifecycle |
| `pnpm db:studio` | Drizzle Studio (DB GUI) |
| `pnpm db:generate` | Diff schema → SQL migration files in `drizzle/` |
| `pnpm db:push` | Apply schema directly (no migration files); interactive prompts on non-empty DBs |
| `pnpm db:migrate` | Same as `db:push` today (see "Footguns" §7) |
| `pnpm db:seed` | Full seed: Super Admin + festival owner + sample festival |
| `pnpm db:seed:admin` | Super Admin only (see §5) |
| `pnpm db:clean` | `DROP SCHEMA public CASCADE` — refuses remote URLs without `--force` |
| `pnpm db:reset` | `db:clean` + `db:push` (local-only unless `--force`) |
| `pnpm db:setup` | `db:start` + `db:push` + `db:seed` (Docker path) |

### Email in dev

`RESEND_API_KEY` is **optional** locally. `send.ts` detects the missing key and
prints the rendered email to the console via the dev fallback — no Resend
quota is burned. In prod the key is required and the `EMAIL_FROM` domain must
be verified in the Resend dashboard.

---

## 4. Schema migrations

The schema lives in `src/core/database/schema.ts`. Drizzle writes generated SQL
to `drizzle/*.sql` with a journal in `drizzle/meta/_journal.json`.

### Today: `db:push` (diff + apply)

`drizzle-kit push` introspects the target DB, diffs against your schema files,
and emits the DDL to bring the DB in line. No migration files are committed —
the diff is recomputed every run.

This is fine **while you have no real users**. The README calls this out:
once the project has any real data, switch to `db:generate` + replay.

### Target: `db:generate` + `db:migrate` (file-based)

```bash
pnpm db:generate    # writes drizzle/NNNN_*.sql + updates the journal
# review the SQL, commit it
DATABASE_URL_UNPOOLED=<prod-unpooled> pnpm db:migrate
```

This is reproducible, reviewable in PRs, and survives `drizzle-kit`'s
interactive-prompt behaviour against non-empty DBs.

### Footgun: the current journal is incomplete

`drizzle/meta/_journal.json` has 22 entries but `drizzle/*.sql` has 27 files.
Missing entries (e.g. `0023`, `0025`, `0026`) have no journal row, so
`drizzle-kit migrate` against a fresh DB will skip them. Cleanup is tracked as
a follow-up to `issues/done/neon-database-adoption.md`.

---

## 5. Seeding

Two scripts, both with safety checks so you can't accidentally nuke prod.

### `pnpm db:seed` — full sample festival

`scripts/seed.ts` + `scripts/seed/*.ts` create:

1. Super Admin user (from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_NAME` in
   `scripts/seed/config.ts` — currently `trizocommunity@gmail.com`).
2. Festival owner user + institution (`Ahlussuffa IGS`).
3. Festival record (`SUFFA MEHFIL 2026`, PRO tier) + a recorded Pro payment +
   purchase summary.
4. Taxonomies (categories, groups, stages, judges).
5. Participants, programmes, sessions — sized for QA snapshots.
6. Prints a summary table to stdout.

### `pnpm db:seed:admin` — Super Admin only

`scripts/seed-superadmin.ts` is idempotent: it upserts the Super Admin row
(updates `fullName` / `displayName` / `updatedAt` if the user already exists,
inserts if not). Useful for provisioning prod without dropping or rebuilding
the rest of the data.

### Safety check: refusing to seed remote URLs

Both scripts guard against accidentally running against prod:

```ts
const isLocal = /localhost|127\.0\.0\.1|::1/i.test(raw);
if (!isLocal && !force) {
  throw new Error("Refusing to seed against a remote DATABASE_URL. Pass --force to continue.");
}
```

`--force` is read via `process.argv.includes("--force")`. **Caveat:** when
invoked via `pnpm db:seed:admin -- --force`, pnpm forwards the flag to pnpm
itself, not to the script — `process.argv` does not see it. Run directly
through `tsx` to pass it through:

```bash
pnpm exec tsx scripts/seed-superadmin.ts --force
```

### `pnpm db:clean` / `db:reset`

`scripts/clean.ts` drops the `public` schema and recreates it. The safety
guard is stricter: it also rejects any URL that contains neither
`localhost|127.0.0.1|::1` nor `neondb_owner` (the prod role substring) unless
`--force` or `ALLOW_DROP=true` is set, and additionally refuses to run if
`NODE_ENV === "production"`.

---

## 6. PROD workflow (Vercel + Neon)

### One-time project setup

1. **Create the Neon project** via CLI:
   ```bash
   neonctl projects create --name greenroom
   neonctl connection-string main --pooled     # → DATABASE_URL
   neonctl connection-string main              # → DATABASE_URL_UNPOOLED
   ```

2. **In Vercel project settings → Environment Variables**, add for both
   **Production** and **Preview** scopes:
   - `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (Neon pooled + direct)
   - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` — fresh per env
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — if using Google OAuth
   - `RAZORPAY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_CLOUDINARY_*`,
     `CLOUDINARY_API_*` — anything you actually use

3. **Install the Neon � Vercel marketplace integration.** After this, every PR
   preview deployment gets an auto-provisioned, auto-torn-down Neon branch
   with `DATABASE_URL` injected. Without it, previews fail or share prod data.

4. **Push to your default branch** — Vercel builds and deploys.

### Per-deploy

- Vercel runs `next build` against the configured env vars.
- Runtime code reads `DATABASE_URL` (pooled) lazily via
  `getPool()` / `getDb()` in `src/core/database/client.ts`. Lazy construction
  exists specifically so `next build`'s "Collecting page data" phase can
  statically import `client.ts` without `DATABASE_URL` being set at build
  time.
- Vercel Cron fires daily at `00:00 UTC` (`vercel.json` →
  `/api/v1/cron`), authenticating with `Authorization: Bearer <CRON_SECRET>`.
  The handler runs:
  1. `FestivalExpirationService.runNotificationsCycle()`
     (T-7 expiry warnings)
  2. `runPreArchivalCycle()` (T-1 → ARCHIVED status flip)
  3. `runExpirationCycle()` (post-end → EXPIRED)
  4. `runFestivalExpiringSoonEmails()`
  5. `deleteExpiredExports()` (export artifact GC)
- `createCronHandler` (`src/api/lib/create-handler.ts`) refuses to construct
  in production if `CRON_SECRET` is unset — fail-fast at module load, not on
  every 403.

### Preview deployments

The Neon ↔ Vercel integration creates a Neon branch per PR preview,
injects `DATABASE_URL`, and tears the branch down when the preview is
removed. `DATABASE_URL_UNPOOLED` is **not** injected by the integration;
preview deploys can't run migrations. Keep migration work on `main` / `develop`.

### Promoting a preview branch to prod

The team doesn't currently auto-promote DB data from preview to prod. Each
preview starts empty (well, branched from `main`'s last snapshot) and is
disposable. If you need to persist data out of a preview:

1. `neonctl branches list --project-id <id>` — find the preview branch.
2. From the preview's connection string, dump what you need via `pg_dump`.
3. Restore into Neon `main` via `psql` / a one-off migration.

---

## 7. Common operations

### Rotate the Neon DB password

Full runbook lives in `issues/done/neon-database-adoption.md` → Appendix A.
Summary: reset role password in Neon (dashboard or
`neonctl roles reset-password`), pull both fresh connection strings, paste
into Vercel Production env vars, force a redeploy. Plan ~1 minute of
user-visible login downtime between reset and redeploy completing.

### Rotate `BETTER_AUTH_SECRET` / `CRON_SECRET`

Generate fresh values via `openssl rand -hex 32`, update Vercel env vars,
force a redeploy. Note: rotating `BETTER_AUTH_SECRET` invalidates every existing
Better Auth session — users will need to log in again, and any in-flight cron
call will be 403'd until the new value is live.

### Reset the local DB

```bash
pnpm db:reset    # clean + push + seed (Docker Postgres only)
pnpm db:reset -- --force   # if you pointed .env at a non-local URL
```

### Inspect a DB

```bash
pnpm db:studio   # Drizzle Studio, uses DATABASE_URL_UNPOOLED
```

Or directly:

```bash
psql "$(neonctl connection-string main --pooled)"
```

### Apply a migration to prod

Today the project uses `db:push` (see §4). To apply a schema change to prod:

```bash
DATABASE_URL_UNPOOLED=<prod-direct-url> pnpm db:push
```

Against a non-empty prod DB, drizzle-kit tries to interactively resolve table
conflicts and throws `Interactive prompts require a TTY terminal` in non-TTY
shells. Workarounds: pipe numbered responses, drop the public schema first,
or switch to file-based migrations (`db:generate` + replay).

---

## 8. Footguns (read once, save hours later)

1. **`.env` is gitignored.** The repo has a checked-out `.env` for the team
   to use locally, but fresh clones won't have one — copy from
   `.env.example`.

2. **`pnpm db:seed:admin -- --force` does NOT pass `--force` through.**
   Run `pnpm exec tsx scripts/seed-superadmin.ts --force` directly (same for
   `db:clean` / `db:reset`).

3. **`drizzle-kit push` against a non-empty DB is fragile.** Drop schema
   first, pipe responses, or generate migration files. See §4.

4. **The Drizzle journal is incomplete.** `migrate` will skip files without a
   journal row. Until that's cleaned up, prefer `push` over `migrate` for
   fresh DBs. (Tracked as follow-up.)

5. **`drizzle.config.ts` does not call `scrubConnectionString`.** The runtime
   client strips `sslmode` etc. before handing the URL to `pg.Pool`. Drizzle-kit
   reads the URL as-is. Fine for Neon (always `sslmode=require`), worth
   knowing if you ever change providers.

6. **`RESEND_API_KEY` unset in dev ≠ unset in prod.** The dev fallback prints
   the email to the console; prod with no key silently no-ops. If you're
   testing email flows against prod, double-check the key is actually set.

7. **`CRON_SECRET` unset in prod = handler throws at module load.** This is
   intentional — silent 403s on every cron invocation are worse than a
   startup crash that points at the missing var. Don't disable the check.

8. **Preview branches don't get `DATABASE_URL_UNPOOLED`.** The Neon ↔ Vercel
   integration injects the pooled URL only. Don't try to run `db:push`
   against a preview — it will fail to connect.

9. **The app uses `db.transaction()` 12× across the codebase.** Don't switch
   to `neon-http` serverless driver — it doesn't support interactive
   transactions. The current `pg.Pool` setup stays. (Decision recorded in
   `issues/done/neon-database-adoption.md` §3.)

10. **`pnpm db:clean` against prod will drop everything.** The guard
    catches remote URLs that aren't `localhost|127.0.0.1|::1` AND don't
    contain `neondb_owner`, but if you ever change the prod role name, the
    guard silently lets you through. Verify the URL manually before
    `--force`.
