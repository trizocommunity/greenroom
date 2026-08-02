# Greenroom

A festival-management SaaS that helps organizers run events end-to-end — tickets, schedules, teams, payments, the lot.

Built with Next.js 16, React 19, Drizzle ORM, and PostgreSQL (Neon in production).

---

## Run it locally

You'll need Node.js 20+ and either a Neon account or Docker.

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in at least `JWT_SECRET` and your database URL:

```bash
openssl rand -hex 32   # paste into JWT_SECRET (32+ chars)
```

Pick **one** database option below, then come back and start the app:

```bash
npm run dev   # http://localhost:3000
```

### Option A — Neon (recommended, mirrors production)

```bash
neonctl projects create --name greenroom-dev
neonctl connection-string main --pooled       # → DATABASE_URL
neonctl connection-string main                # → DATABASE_URL_UNPOOLED
```

Drop both into `.env.local`, then:

```bash
npm run db:push   # apply the schema
npm run db:seed   # optional: creates a Super Admin + sample festival
```

### Option B — Local Postgres via Docker

Zero config — the defaults in `.env.example` already point at the container:

```bash
npm run db:setup   # starts Postgres on :5433, pushes schema, seeds
npm run dev
```

Stop the database whenever: `npm run db:stop`.

---

## Deploy to production (Vercel)

1. Create a Neon project + branch.
2. In Vercel, add these env vars for **Production** and **Preview**:
   - `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (the pooled + direct Neon strings).
   - `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` (generate fresh ones per env).
   - Anything you actually use: `RAZORPAY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `CLOUDINARY_*`.
3. Install the **Neon → Vercel** integration so each PR preview gets its own isolated DB branch.
4. Push to your default branch — Vercel builds and deploys.

That's it. The cron in `vercel.json` calls `/api/v1/cron` once a day for festival expiry + pre-archival work; it authenticates against `CRON_SECRET`.

---

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app in dev mode |
| `npm run build` / `npm run start` | Production build & serve |
| `npm run lint` / `npm run format` / `npm run check` | Biome |
| `npm test` | Vitest |
| `npm run db:push` | Apply Drizzle schema to the DB |
| `npm run db:generate` | Diff schema → SQL migration files |
| `npm run db:studio` | Drizzle Studio (DB GUI) |
| `npm run db:seed` | Seed Super Admin + sample festival |
| `npm run db:reset` | Clean → push → seed (local only unless `--force`) |
| `npm run db:setup` | Docker variant of `db:reset` |

---

## A few notes

- **Two database URLs, not one.** Production needs both the pooled string (for the app) and the unpooled string (for drizzle-kit, which issues DDL that doesn't play with PgBouncer).
- **Don't commit `.env*`.** Only `.env.example` belongs in the repo.
- **Schema changes** should land as generated migrations once the project has any real users — switch from `db:push` to `db:generate` + `db:migrate` at that point.
