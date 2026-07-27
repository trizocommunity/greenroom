# Greenroom - Festival Management

Festival-management SaaS (Next.js 16, React 19, Drizzle ORM, PostgreSQL on Neon).

## Local Development

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL / DATABASE_URL_UNPOOLED / JWT_SECRET / CRON_SECRET
npm run dev
```

The app expects a real PostgreSQL — provision one of the following:

### Option A — Neon (recommended, matches production)
```bash
# install neonctl: https://neon.tech/docs/reference/cli-install
neonctl projects create --name greenroom-dev
neonctl connection-string main --pooled
neonctl connection-string main        # unpooled
```
Paste both strings into `.env.local` as `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, then:
```bash
npm run db:push       # apply schema to your branch
npm run db:seed       # optional: seed Super Admin + sample festival
npm run dev
```

### Option B — Local Docker Postgres (legacy)
```bash
npm run db:setup      # starts container, pushes schema, seeds
npm run dev
```
Local Postgres runs on `localhost:5433`; default `DATABASE_URL` in `.env.example` points there.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon pooled endpoint in prod, or local Docker). |
| `DATABASE_URL_UNPOOLED` | Prod only | Direct Postgres endpoint for drizzle-kit migrations. |
| `JWT_SECRET` | Yes | Secret used to sign/verify session cookies (≥ 32 chars). |
| `NEXT_PUBLIC_APP_URL` | Yes | Public origin used in emails, redirects, magic links. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | For payments | Razorpay API keys. |
| `RESEND_API_KEY` / `EMAIL_FROM` | For email | Magic-link + invitation emails. |
| `CLOUDINARY_*` | For uploads | Cloudinary cloud + presets. |
| `SENTRY_DSN` | Optional | Frontend / server error reporting. |
| `CRON_SECRET` | Prod only | Secret sent by Vercel Cron in the `x-cron-secret` header. |

## Database scripts (`package.json`)

- `npm run db:generate` — `drizzle-kit generate` (diff schema → SQL)
- `npm run db:migrate` / `npm run db:push` — `drizzle-kit push` (apply schema directly)
- `npm run db:studio` — `drizzle-kit studio`
- `npm run db:seed` — `tsx scripts/seed.ts` (Super Admin + Ahlussuffa IGS Pro festival)
- `npm run db:clean` — `tsx scripts/clean.ts` (drop schema; refuses to run against a non-local URL without `--force`)
- `npm run db:reset` — clean + push + seed
- `npm run db:setup` — Docker variant: start container + push + seed

## Cron / scheduled jobs

`vercel.json` schedules a daily call to `/api/v1/cron`, which runs the festival expiration + pre-archival cycles. The handler at `src/app/api/v1/cron/route.ts` validates the `x-cron-secret` header against `CRON_SECRET`.

## Deployment (Vercel)

1. Provision a Neon project + branch.
2. Set both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in Vercel environment variables (Production + Preview).
3. Set `JWT_SECRET`, `CRON_SECRET`, and any third-party keys (`RAZORPAY_*`, `RESEND_API_KEY`, `CLOUDINARY_*`).
4. Install the Neon–Vercel marketplace integration so each PR preview gets an isolated database branch.
5. Deploy.

## Verification

- **Build safety**: `npm run build` must complete without DB-related warnings.
- **Migrations**: prefer `db:migrate` over `db:push` once `drizzle/meta/_journal.json` covers all on-disk SQL files.
