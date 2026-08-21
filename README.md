# Greenroom

Festival-management SaaS — tickets, schedules, teams, payments, the lot.

Built with Next.js 16, React 19, Drizzle ORM, PostgreSQL (Neon in production), and Better Auth.

---

## Run locally

Requires Node.js 20+ and either a Neon account or Docker.

```bash
pnpm install
cp .env.example .env.local
openssl rand -hex 32   # → BETTER_AUTH_SECRET in .env.local
```

### Option A — Neon (recommended)

```bash
neonctl projects create --name greenroom-dev
neonctl connection-string main --pooled       # → DATABASE_URL
neonctl connection-string main                # → DATABASE_URL_UNPOOLED
```

Paste both into `.env.local`, then:

```bash
pnpm db:push
pnpm db:seed   # optional
pnpm dev       # http://localhost:3000
```

### Option B — Docker Postgres

```bash
pnpm db:setup   # starts Postgres on :5433, pushes schema, seeds
pnpm dev
pnpm db:stop    # when done
```

---

## Deploy to production (Vercel)

1. Create a Neon project + branch.
2. Add these env vars in Vercel for **Production** and **Preview**:
   - `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
   - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (if using Google auth)
   - Whatever you use: `RAZORPAY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `CLOUDINARY_*`
3. Install the **Neon → Vercel** integration for isolated preview DB branches.
4. Push to your default branch — Vercel builds and deploys.

---

## Production database ops

Run from the terminal without editing `.env`:

```bash
# Clean (wipes everything) — requires --force for remote/production URLs
DATABASE_URL="postgresql://..." pnpm db:clean -- --force

# Push schema — drizzle-kit needs the unpooled URL
DATABASE_URL_UNPOOLED="postgresql://..." DATABASE_URL="postgresql://..." pnpm db:push

# Seed
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/seed-superadmin.ts --force

```

Windows: in CMD use `set URL=...&& pnpm ...`; in PowerShell use `$env:URL="..."; pnpm ...`.

---

## Useful scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build & serve |
| `pnpm lint` / `pnpm format` / `pnpm check` | Biome |
| `pnpm test` | Vitest |
| `pnpm db:push` | Apply Drizzle schema |
| `pnpm db:generate` | Diff schema → SQL migration files |
| `pnpm db:migrate` | Run generated migrations |
| `pnpm db:studio` | Drizzle Studio GUI |
| `pnpm db:seed` | Seed Super Admin + sample festival |
| `pnpm db:reset` | Clean → push → seed (local only unless `--force`) |
| `pnpm db:setup` | Docker variant of `db:reset` |

---

## Notes

- **Two DB URLs:** `DATABASE_URL` is pooled (app runtime), `DATABASE_URL_UNPOOLED` is direct (drizzle-kit DDL).
- **Don't commit `.env*`.** Only `.env.example` belongs in the repo.
- **After real users exist,** switch from `db:push` to `db:generate` + `db:migrate`.
