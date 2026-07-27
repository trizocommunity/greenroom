p# Adopt Neon Postgres: Provider Decision, Tenancy Model, and Provisioning Plan

## Status
- **Created**: 2026-07-27
- **Status**: Approved
- **Priority**: High
- **Complexity**: Low-Medium

---

## Summary

Adopt [Neon](https://neon.com) as the project's hosted Postgres provider, replacing the local-only Docker Postgres setup (`docker-compose.yml`) with a real staging/production database. Nothing currently runs in production — this is a **fresh provisioning task, not a migration**. There is no existing data to move and no cutover risk.

Provisioning is done via the **Neon CLI (`neonctl`)** rather than the dashboard, so the whole setup is scriptable and reproducible. No ORM or driver changes are needed — Neon is wire-compatible Postgres, and the app keeps using `drizzle-orm/node-postgres` + `pg.Pool` exactly as it does today.

---

## Problem Statement

1. **No hosted database** — the app only has a local Docker Postgres (`postgres:16-alpine`, port `5433`). There is no staging/prod database, and no story for per-PR preview environments on Vercel.
2. **Stale Supabase reference** — `drizzle.config.ts` has a leftover comment ("Run generated SQL in Supabase SQL Editor manually") from an earlier, never-implemented consideration. Supabase was never actually wired up (no Supabase SDK, no Supabase env vars anywhere in the codebase) and nothing is in production. This comment should be removed to avoid confusing future setup.
3. **Tenancy model needs to be explicit before picking infra** — Neon markets a "branch-per-tenant" pattern heavily, and it would be easy to reach for it by default without checking whether it fits this app's actual tenant boundary (`festivalId`) and its cross-tenant super-admin reporting needs.
4. **Driver compatibility needs to be confirmed** — the app relies on `db.transaction(...)` (interactive/session transactions) in 12 files. Some Neon setup guides push the `neon-http` serverless driver, which does not support interactive transactions in production. This must not be adopted blindly.

---

## Decisions (recorded here so they aren't re-litigated)

### 1. Provider: Neon over Supabase

Both are Postgres, so this came down to whether Supabase's bundled platform (auth, storage, realtime, edge functions) adds value here. It doesn't:

| Need | Already solved by |
|---|---|
| Auth | Custom — `bcryptjs` + `jose` (hand-rolled JWT) |
| File/image storage | Cloudinary (`next.config.ts` remote patterns) |
| Scheduled jobs | Vercel Cron (`vercel.json` → `/api/cron/cleanup`) |
| Realtime | Not used anywhere in the stack |

Since none of Supabase's differentiators apply, this is a pure Postgres-infra decision, and Neon wins on the parts that matter for this app:
- **True copy-on-write branching** (Supabase branches duplicate full storage; Neon branches are near-free and near-instant) — matters for per-PR preview databases on Vercel.
- **Genuine scale-to-zero** (autosuspend ~5 min idle, ~500ms resume) — fits a festival-management app where individual festivals go idle between events (see `festival-expiration.service.ts`).
- Pricing rewards idle/spiky usage (pay-per-second compute + $0.35/GB storage) rather than Supabase's flatter always-on billing.

### 2. Tenancy model: keep shared-schema + `festivalId` column (do NOT adopt branch-per-tenant)

The app is already multi-tenant using the standard SaaS pattern: one shared database, one shared schema, tenant discriminated by a `festivalId` column (147 references across `src/core/database/schema.ts`). Isolation is enforced at the application/query layer (no Postgres RLS tenant policies exist today — the two RLS-related lines in migrations `0004`/`0007` only disable RLS on unrelated legacy tables).

**Decision: stay on this model on a single Neon branch for production.** Reasons:
- The super-admin surface (`/super-admin/analytics`, `/super-admin/audit-logs`, `/super-admin/payments`, `/super-admin/festivals`, `/super-admin/users`) does cross-tenant aggregation. Branch-per-tenant would turn every one of those queries into a fan-out across N separate Postgres connections aggregated in application code.
- The app has 12 `db.transaction(...)` call sites against a single global `pg.Pool` (`src/core/database/client.ts`). Per-tenant branches would require a dynamic per-tenant connection-pool registry (open/cache/evict), a real engineering lift with no current justification.
- Neon branch limits are plan-gated (10 on Free/Launch, 25 on Scale, +$1.50/branch-month beyond that) — fine for a handful of PR-preview branches, not viable as "one branch per festival" at any real tenant count.

**Where branching is actually used:** per-PR preview environments (Phase 4 below), and optionally, later, a dedicated branch offered only to a small number of high-ARPU enterprise tenants as a premium isolation tier — not the default architecture.

**Optional future hardening (out of scope for this issue):** add real Postgres RLS policies on tenant tables scoped by a `festivalId` session variable, as defense-in-depth on top of the existing app-layer filtering. Track as a separate follow-up issue if wanted.

### 3. Driver: no change — keep `drizzle-orm/node-postgres` + `pg.Pool`

Neon's `neon-http` driver doesn't support interactive transactions in production, and this app depends on `db.transaction()` in: `festival-expiration.service.ts`, `festival-crud.actions.ts`, `group.service.ts`, `programme-reporting.service.ts`, `assignment.service.ts`, `judgment.actions.ts`, `code-letter-generator.service.ts`, `scoring-policy.service.ts`, `gallery.actions.ts`, `admin.actions.ts`, `schedule.actions.ts`, `chest-number.actions.ts`. Neon is standard wire-compatible Postgres, so the existing `pg.Pool`-based client works against it unchanged — this is a connection-string swap, not a driver rewrite.

### 4. Provisioning: Neon CLI (`neonctl`), not the dashboard

`neonctl` (aliased `neon`) supports project/branch creation, connection-string retrieval, `--output json`, and non-interactive auth via `NEON_API_KEY` — so setup can be run from the terminal and re-run for future branches instead of manual dashboard clicks.

---

## Solution: Provisioning Plan

### Phase 0 — Auth
- Run `npx neonctl auth` (one-time interactive browser login to a Neon account), or generate an API key in the Neon console and export it as `NEON_API_KEY` for non-interactive use.

### Phase 1 — Provision project
- `neonctl projects create --name greenroom` → capture project ID and default branch connection string.
- `neonctl connection-string <branch> --pooled` and the unpooled equivalent (omit `--pooled`) — need both.

### Phase 2 — Wire up the codebase
- `drizzle.config.ts` — point `dbCredentials.url` at the **unpooled** Neon connection string; remove the stale "Supabase SQL Editor" comment.
- `src/core/database/client.ts` — no logic changes needed (existing `isLocalConnection` / SSL handling already does the right thing for a non-local host); reduce `poolConfig.max` in production (currently `10`) since Neon's built-in pooler already multiplexes connections across serverless invocations.
- `.env.example` — add `DATABASE_URL` (pooled, for the app) and `DATABASE_URL_UNPOOLED` (direct, for migrations).

### Phase 3 — Apply schema
- Run `npm run db:push` (or `db:generate` + apply) against the fresh Neon branch using the existing 12 migration files in `drizzle/` (`0000`–`0011`).
- Spot-check with `drizzle-kit studio` or `neonctl` that tables/relations match `schema.ts`/`relations.ts`.

### Phase 4 — Preview branching (Vercel)
- Install the official Neon–Vercel marketplace integration so each PR preview deployment gets an auto-provisioned, auto-torn-down branch with `DATABASE_URL` injected automatically.
- `neonctl branches create` remains available for scripting branches outside of Vercel (e.g. local per-developer branches) if the team wants to retire `docker-compose.yml` later.

### Phase 5 — Production cutover
- Set `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` in Vercel's Production environment variables.
- Deploy, then smoke-test the 12 transactional flows listed above end-to-end against the live Neon branch.

### Phase 6 — Out of scope, tracked separately
- RLS hardening on `festivalId` (see Decision 2).
- Retiring `docker-compose.yml` local Postgres in favor of per-developer Neon branches.
- Dedicated-branch enterprise tenant tier.

---

## Configuration Changes

- `drizzle.config.ts` — `dbCredentials.url` → unpooled Neon URL; remove stale Supabase comment.
- `src/core/database/client.ts` — lower `poolConfig.max` for production.
- `.env.example` — add `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
- Vercel project settings — add both env vars to Preview and Production; install Neon–Vercel integration.
- No changes to `package.json` scripts, no ORM/driver package changes.

---

## Testing Strategy

1. **Connection smoke test** — confirm the app connects and runs a simple query against the new Neon branch (pooled and unpooled) before wiring CI/prod.
2. **Transactional flow smoke test** — exercise each of the 12 `db.transaction(...)` call sites (scoring policy, assignments, festival CRUD, group service, programme reporting, judgment actions, code-letter generation, gallery, admin, schedule, chest-number) against the new branch.
3. **Concurrency check** — confirm the reduced pool size + Neon's pooler doesn't exhaust connections under concurrent Vercel function invocations.
4. **SSL check** — confirm `isLocalConnection`/SSL branch in `client.ts` correctly negotiates TLS against the non-local Neon host.
5. **Preview branch check** — open a test PR after Phase 4 and confirm a preview branch is created and `DATABASE_URL` is injected correctly.

---

## Acceptance Criteria

- [ ] Neon project provisioned via `neonctl` (not dashboard).
- [ ] Pooled + unpooled connection strings captured.
- [ ] `drizzle.config.ts` updated (unpooled URL, stale Supabase comment removed).
- [ ] `client.ts` pool size tuned for Neon's pooler.
- [ ] `.env.example` updated with `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
- [ ] Existing 12 migrations applied cleanly to the new Neon branch.
- [ ] All 12 `db.transaction(...)` call sites verified working against Neon.
- [ ] Neon–Vercel integration installed; PR preview branches confirmed working.
- [ ] Production `DATABASE_URL`/`DATABASE_URL_UNPOOLED` set in Vercel; production deploy verified.
- [ ] No branch-per-tenant architecture introduced — shared schema + `festivalId` remains the tenancy model.
