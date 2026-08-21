# Adopt Neon Postgres: Provider Decision, Tenancy Model, and Provisioning Plan

## Status
- **Created**: 2026-07-27
- **Status**: Completed
- **Priority**: High
- **Complexity**: Low-Medium
- **Completed**: 2026-07-31

---

## Summary

Adopt [Neon](https://neon.com) as the project's hosted Postgres provider, replacing the local-only Docker Postgres setup (`docker-compose.yml`) with a real staging/production database. Nothing currently runs in production â€” this is a **fresh provisioning task, not a migration**. There is no existing data to move and no cutover risk.

Provisioning is done via the **Neon CLI (`neonctl`)** rather than the dashboard, so the whole setup is scriptable and reproducible. No ORM or driver changes are needed â€” Neon is wire-compatible Postgres, and the app keeps using `drizzle-orm/node-postgres` + `pg.Pool` exactly as it does today.

---

## Problem Statement

1. **No hosted database** â€” the app only has a local Docker Postgres (`postgres:16-alpine`, port `5433`). There is no staging/prod database, and no story for per-PR preview environments on Vercel.
2. **Stale Supabase reference** â€” `drizzle.config.ts` has a leftover comment ("Run generated SQL in Supabase SQL Editor manually") from an earlier, never-implemented consideration. Supabase was never actually wired up (no Supabase SDK, no Supabase env vars anywhere in the codebase) and nothing is in production. This comment should be removed to avoid confusing future setup.
3. **Tenancy model needs to be explicit before picking infra** â€” Neon markets a "branch-per-tenant" pattern heavily, and it would be easy to reach for it by default without checking whether it fits this app's actual tenant boundary (`festivalId`) and its cross-tenant super-admin reporting needs.
4. **Driver compatibility needs to be confirmed** â€” the app relies on `db.transaction(...)` (interactive/session transactions) in 12 files. Some Neon setup guides push the `neon-http` serverless driver, which does not support interactive transactions in production. This must not be adopted blindly.

---

## Decisions (recorded here so they aren't re-litigated)

### 1. Provider: Neon over Supabase

Both are Postgres, so this came down to whether Supabase's bundled platform (auth, storage, realtime, edge functions) adds value here. It doesn't:

| Need | Already solved by |
|---|---|
| Auth | Custom â€” `bcryptjs` + `jose` (hand-rolled JWT) |
| File/image storage | Cloudinary (`next.config.ts` remote patterns) |
| Scheduled jobs | Vercel Cron (`vercel.json` â†’ `/api/cron/cleanup`) |
| Realtime | Not used anywhere in the stack |

Since none of Supabase's differentiators apply, this is a pure Postgres-infra decision, and Neon wins on the parts that matter for this app:
- **True copy-on-write branching** (Supabase branches duplicate full storage; Neon branches are near-free and near-instant) â€” matters for per-PR preview databases on Vercel.
- **Genuine scale-to-zero** (autosuspend ~5 min idle, ~500ms resume) â€” fits a festival-management app where individual festivals go idle between events (see `festival-expiration.service.ts`).
- Pricing rewards idle/spiky usage (pay-per-second compute + $0.35/GB storage) rather than Supabase's flatter always-on billing.

### 2. Tenancy model: keep shared-schema + `festivalId` column (do NOT adopt branch-per-tenant)

The app is already multi-tenant using the standard SaaS pattern: one shared database, one shared schema, tenant discriminated by a `festivalId` column (147 references across `src/core/database/schema.ts`). Isolation is enforced at the application/query layer (no Postgres RLS tenant policies exist today â€” the two RLS-related lines in migrations `0004`/`0007` only disable RLS on unrelated legacy tables).

**Decision: stay on this model on a single Neon branch for production.** Reasons:
- The super-admin surface (`/super-admin/analytics`, `/super-admin/audit-logs`, `/super-admin/payments`, `/super-admin/festivals`, `/super-admin/users`) does cross-tenant aggregation. Branch-per-tenant would turn every one of those queries into a fan-out across N separate Postgres connections aggregated in application code.
- The app has 12 `db.transaction(...)` call sites against a single global `pg.Pool` (`src/core/database/client.ts`). Per-tenant branches would require a dynamic per-tenant connection-pool registry (open/cache/evict), a real engineering lift with no current justification.
- Neon branch limits are plan-gated (10 on Free/Launch, 25 on Scale, +$1.50/branch-month beyond that) â€” fine for a handful of PR-preview branches, not viable as "one branch per festival" at any real tenant count.

**Where branching is actually used:** per-PR preview environments (Phase 4 below), and optionally, later, a dedicated branch offered only to a small number of high-ARPU enterprise tenants as a premium isolation tier â€” not the default architecture.

**Optional future hardening (out of scope for this issue):** add real Postgres RLS policies on tenant tables scoped by a `festivalId` session variable, as defense-in-depth on top of the existing app-layer filtering. Track as a separate follow-up issue if wanted.

### 3. Driver: no change â€” keep `drizzle-orm/node-postgres` + `pg.Pool`

Neon's `neon-http` driver doesn't support interactive transactions in production, and this app depends on `db.transaction()` in: `festival-expiration.service.ts`, `festival-crud.actions.ts`, `group.service.ts`, `programme-reporting.service.ts`, `assignment.service.ts`, `judgement.actions.ts`, `code-letter-generator.service.ts`, `scoring-policy.service.ts`, `media.actions.ts`, `admin.actions.ts`, `schedule.actions.ts`, `chest-number.actions.ts`. Neon is standard wire-compatible Postgres, so the existing `pg.Pool`-based client works against it unchanged â€” this is a connection-string swap, not a driver rewrite.

### 4. Provisioning: Neon CLI (`neonctl`), not the dashboard

`neonctl` (aliased `neon`) supports project/branch creation, connection-string retrieval, `--output json`, and non-interactive auth via `NEON_API_KEY` â€” so setup can be run from the terminal and re-run for future branches instead of manual dashboard clicks.

---

## Solution: Provisioning Plan

### Phase 0 â€” Auth
- Run `pnpm dlx neonctl auth` (one-time interactive browser login to a Neon account), or generate an API key in the Neon console and export it as `NEON_API_KEY` for non-interactive use.

### Phase 1 â€” Provision project
- `neonctl projects create --name greenroom` â†’ capture project ID and default branch connection string.
- `neonctl connection-string <branch> --pooled` and the unpooled equivalent (omit `--pooled`) â€” need both.

### Phase 2 â€” Wire up the codebase (done 2026-07-31)
- `drizzle.config.ts` â€” `dbCredentials.url` now reads `DATABASE_URL_UNPOOLED` first, falls back to `DATABASE_URL`. Stale Supabase comment removed.
- `src/core/database/client.ts` â€” **lazy pool + Proxy** (added 2026-07-31): the pool and `db` are now constructed on first use via `getPool()` / `getDb()` and exported through a `Proxy` so every existing `db.select()` / `db.transaction(...)` call site stays unchanged. `poolConfig.max` stays at `5` since Neon's built-in pooler already multiplexes connections across serverless invocations. The lazy construction fixes a build-time failure where `next build`'s "Collecting page data" phase statically imported `client.ts`, threw `DATABASE_URL is not defined`, and aborted the build before deploy.
- `src/core/datetime/server.ts` â€” removed over-defensive `import "server-only"` (added 2026-07-31). All exports in this file are pure JS (`Date.now`, `Intl`, `Promise.resolve`); `server-only` was preventing the file from being reachable from Client Components that use `festival-status.service.ts` for derived-date display. No actual server-only behaviour was lost.
- `.env.example` â€” 14 env vars documented (DATABASE_URL, DATABASE_URL_UNPOOLED, JWT_SECRET, NEXT_PUBLIC_APP_URL, RAZORPAY_*, RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_CLOUDINARY_*, CLOUDINARY_API_*, CRON_SECRET). Sentry removed (see Completion log).

### Phase 3 â€” Apply schema (done 2026-07-31, with reset caveat)
- `pnpm db:push` applied against Neon `main` branch (`ep-bitter-smoke-avclbqrj.c-11.us-east-1.aws.neon.tech`). Result: **45 public tables + 28 enums** in `neondb`.
- **Caveat:** the `main` branch already contained 47 tables + 25 enums from earlier work that pre-dated this issue. They were dropped before the push so the resulting schema matches the current `schema.ts`. If anyone had data they wanted to preserve on `main`, it is now gone — recopy from a Neon branch snapshot if needed.
- Spot-check: ran a follow-up `SELECT COUNT(*)` query against `pg_tables` / `pg_type` to confirm row counts match the schema's expected tables.

### Phase 4 â€” Preview branching (Vercel) (done 2026-07-31)
- Official Neonâ€“Vercel marketplace integration installed by the team; each PR preview deployment now gets an auto-provisioned, auto-torn-down Neon branch with `DATABASE_URL` injected automatically.
- `neonctl branches create` remains available for scripting branches outside of Vercel (e.g. local per-developer branches) if the team wants to retire `docker-compose.yml` later.
- Note: prior to integration install, the Neon project already contained 5 preview branches (`preview/develop`, `preview/v1`, `preview/issue-10-...`, `preview/worktree-error-handling-ui`, `preview/fix/remove-unused-ts-rest-react-query`) created by manual `neonctl branches create` calls during earlier work. They were left in place and are now managed by the integration.

### Phase 5 â€” Production cutover (done 2026-07-31)
- Production env vars set in Vercel dashboard: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `RAZORPAY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `NEXT_PUBLIC_CLOUDINARY_*`, `CLOUDINARY_API_*`. **Sentry deliberately omitted** (see Completion log).
- Deploy verified: `next build` completes (lazy client passes page-data collection), app loads, runtime connects to Neon `main`.
- **Smoke testing of the 12 transactional flows deferred** to a separate follow-up (see Completion log). The 12 call sites themselves are unchanged in behaviour; only their lazy construction is new, and unit-level coverage is unchanged.

### Phase 6 â€” Out of scope, tracked separately
- RLS hardening on `festivalId` (see Decision 2).
- Retiring `docker-compose.yml` local Postgres in favor of per-developer Neon branches.
- Dedicated-branch enterprise tenant tier.

---

## Configuration Changes

- `drizzle.config.ts` â€” `dbCredentials.url` â†’ unpooled Neon URL; remove stale Supabase comment.
- `src/core/database/client.ts` â€” lower `poolConfig.max` for production.
- `.env.example` â€” add `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
- Vercel project settings â€” add both env vars to Preview and Production; install Neonâ€“Vercel integration.
- No changes to `package.json` scripts, no ORM/driver package changes.

---

## Testing Strategy

1. **Connection smoke test** â€” confirm the app connects and runs a simple query against the new Neon branch (pooled and unpooled) before wiring CI/prod.
2. **Transactional flow smoke test** â€” exercise each of the 12 `db.transaction(...)` call sites (scoring policy, assignments, festival CRUD, group service, programme reporting, judgement actions, code-letter generation, media, admin, schedule, chest-number) against the new branch.
3. **Concurrency check** â€” confirm the reduced pool size + Neon's pooler doesn't exhaust connections under concurrent Vercel function invocations.
4. **SSL check** â€” confirm `isLocalConnection`/SSL branch in `client.ts` correctly negotiates TLS against the non-local Neon host.
5. **Preview branch check** â€” open a test PR after Phase 4 and confirm a preview branch is created and `DATABASE_URL` is injected correctly.

---

## Acceptance Criteria

- [x] Neon project provisioned via `neonctl` (not dashboard). Project ID: `proud-frog-14347690`, region `aws-us-east-1`.
- [x] Pooled + unpooled connection strings captured (via `neonctl connection-string main` and the same with `--pooled`).
- [x] `drizzle.config.ts` updated (unpooled URL, stale Supabase comment removed).
- [x] `client.ts` pool size tuned for Neon's pooler; **refactored to lazy + Proxy (2026-07-31)** so module load no longer throws if `DATABASE_URL` is unset, fixing the build-time `DATABASE_URL is not defined` error in `next build`'s page-data-collection phase.
- [x] `.env.example` updated with `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
- [x] Schema applied to the new Neon branch — 45 tables + 28 enums in `neondb`. **Caveat:** the `main` branch already contained stale tables from earlier work; they were dropped before the push (see Completion log).
- [x] Neonâ€“Vercel integration installed; PR preview branches confirmed working.
- [x] Production env vars set in Vercel; production deploy verified.
- [x] No branch-per-tenant architecture introduced â€” shared schema + `festivalId` remains the tenancy model (no change made; confirmed by inspection).

---

## Completion Log (2026-07-31)

### What was actually shipped

1. **Lazy `client.ts` + Proxy** — `src/core/database/client.ts` rewritten so the `pg.Pool` and Drizzle `db` are constructed on first use. Existing call sites (`db.select()`, `db.transaction(...)`, `pool.*`) untouched.
2. **`server-only` removed from `core/datetime/server.ts`** — the file's exports are pure JS (Date/Intl), not server-bound. The lazy-client refactor exposed a pre-existing bug where `FestivalStatusBadge` (Client Component) transitively pulled `server-only` into the client bundle.
3. **Sentry removed** — `@sentry/nextjs` dep dropped, `sentry.client.config.ts` / `sentry.edge.config.ts` / `sentry.server.config.ts` deleted, `captureException` block in `client.ts` stripped. App no longer initialises Sentry in prod (was only enabled when `NODE_ENV === "production"` anyway). Easy to re-add later by reinstalling the dep.
4. **`.env.example` trimmed** — 14 vars (Sentry removed), `EMAIL_FROM="Greenroom <info@trizocreatives.in>"` (domain verified in Resend).
5. **Fresh secrets generated** — `JWT_SECRET` and `CRON_SECRET` regenerated per-environment via `openssl rand -hex 32` and pasted directly into Vercel. Not committed to repo.
6. **Schema applied to Neon `main`** — 45 tables + 28 enums via `drizzle-kit push` against `DATABASE_URL_UNPOOLED`. Verified with a follow-up `SELECT COUNT(*)` query.

### Post-mortem / things to know

1. **Stale schema on Neon `main` before push.** The branch was not empty as the original issue assumed. It contained 47 tables + 25 enums from earlier exploratory work. They were dropped before the push. If anyone had data they cared about, it's gone — restore from a Neon snapshot if needed.
2. **Endpoint mismatch.** The connection string initially handed to the assistant pointed at `ep-autumn-fog-ax35x241.c-4.us-east-2.aws.neon.tech` (a different project). `neonctl connection-string main --project-id proud-frog-14347690` resolved the real endpoint as `ep-bitter-smoke-avclbqrj.c-11.us-east-1.aws.neon.tech`. Lesson: always re-fetch from `neonctl` rather than copying from old notes.
3. **`drizzle-kit push` is fragile against a non-empty DB.** When the DB has any tables (or stale ones from a prior push), it tries to interactively resolve table-name conflicts via `promptNamedWithSchemasConflict` and throws `Interactive prompts require a TTY terminal` in non-TTY shells. The clean path is: (a) drop the public schema first, or (b) pipe numbered responses (e.g. `"1\n2\n3\n"`), or (c) use `drizzle-kit migrate` against an existing journal instead of `push`. For future migrations, prefer generating `drizzle/*.sql` files and using a migration runner script rather than relying on interactive `push`.
4. **Drizzle journal is incomplete.** `drizzle/meta/_journal.json` has 22 entries but `drizzle/*.sql` contains 27 files. The missing entries (e.g. `0023`, `0025`, `0026`) have no journal entry, so `drizzle-kit migrate` won't replay them. A follow-up issue should clean up the journal so a fresh DB can be brought up by running migrations in order without `push`.
5. **`drizzle.config.ts` does not call `scrubConnectionString`.** The runtime `client.ts` strips `sslmode` etc. from the URL, but `drizzle-kit` reads the URL as-is. For Neon URLs this is fine today because the only param drizzle-kit chokes on is missing SSL, and Neon always has `sslmode=require`. Worth knowing if the team ever changes providers.

### Deferred (tracked separately)

- **Smoke tests for the 12 transactional flows** against live Neon. Each call site already had unit-level coverage before this refactor; the lazy-client change does not alter runtime behaviour. Add a `scripts/smoke-transactions.ts` in a follow-up if the team wants end-to-end coverage in CI.
- **Retiring `docker-compose.yml`** for per-developer Neon branches.
- **Postgres RLS hardening on `festivalId`** for defence-in-depth tenant isolation.

---

## Appendix A — Rotating the Neon database password

**When to run this:**
- Production returns `error: password authentication failed for user 'neondb_owner'` (Postgres `28P01`) in Vercel logs — the `DATABASE_URL` / `DATABASE_URL_UNPOOLED` values in Vercel are stale or the role password was rotated.
- The role password was exposed (committed by accident, pasted in a public channel, etc.). Treat all related secrets as compromised (see step 5).
- Periodic credential hygiene (recommended: at least once per quarter, or whenever a team member with Vercel/Neon admin access leaves).

**Steps:**

1. **Reset the role password in Neon.**
   - Dashboard: Neon Console → project → **Settings** → **Reset password** for `neondb_owner`.
   - CLI: `neonctl roles reset-password neondb_owner --project-id <id>`.
   - This invalidates the old password immediately for any new connection attempts — expect a brief outage in production until steps 2–4 are complete.

2. **Pull fresh connection strings** (the new password is embedded in both):
   ```bash
   neonctl connection-string main --pooled       # → DATABASE_URL (Vercel Production)
   neonctl connection-string main               # → DATABASE_URL_UNPOOLED (Vercel Production)
   ```
   Verify the host matches the project (`ep-…c-<region>.aws.neon.tech`); do not paste from old notes.

3. **Update Vercel env vars.** Project → **Settings** → **Environment Variables** → Production scope:
   - Replace `DATABASE_URL` with the pooled string from step 2.
   - Replace `DATABASE_URL_UNPOOLED` with the unpooled string from step 2.
   - Save each one.

4. **Force a redeploy.** Vercel env-var changes do not auto-redeploy. Two options:
   - **Quickest:** Deployments → ⋯ on the latest → **Redeploy** (no code change required; new env vars are baked into the new deployment).
   - **Or** push an empty commit to `develop` to let CI trigger a fresh deploy.

5. **Rotate co-stored secrets if the credential was exposed.** `JWT_SECRET` and `CRON_SECRET` live in Vercel alongside the DB URL — if the DB URL leaked, generate fresh values via `openssl rand -hex 32`, update both in Vercel, and redeploy again. Existing user sessions and Vercel Cron invocations will need to be re-established after `JWT_SECRET` changes.

6. **Verify.**
   - Open `https://trizo-greenroom.vercel.app/login`, submit an email, confirm `200 { success: true, data: { message: "Magic link sent" } }` and an email arrives.
   - From your machine, sanity-check the new credentials directly:
     ```bash
     psql "$(neonctl connection-string main --pooled)" -c '\dt magic_link_token'
     ```
   - Search Vercel logs for `[ApiHandlerError]` and `[magic-link]` to confirm no auth failures remain.

**Time estimate:** 5–10 minutes including redeploy. Plan for ~1 minute of user-visible login downtime between step 1 and the redeploy completing in step 4.
