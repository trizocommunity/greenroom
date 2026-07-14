# Greenroom - Festival Management

## Local Development
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

Required for the app to run:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (defaults to local Docker DB: `postgresql://postgres:postgres@localhost:5433/greenroom`). |
| `JWT_SECRET` | Yes | Secret used to sign/verify session cookies (e.g. a long random string) |

Required for payment (Razorpay):

| Variable | Required | Description |
|----------|----------|-------------|
| `RAZORPAY_KEY_ID` | For payments | Razorpay API key (public) |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay API secret |

Optional (e.g. email, Resend):

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | For forgot-password email | Resend API key for sending password reset emails |

Example `.env` (Docker Local Database):

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/greenroom"
JWT_SECRET=your-secret-at-least-32-chars
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
```

## Database Setup (Docker PostgreSQL)

This project uses **PostgreSQL via Docker Compose** for local development.

Quick All-in-One Setup (start Docker, push schema, and seed data):
```bash
npm run db:setup
```

Or step-by-step:
1. **Start Local Docker Database**: `npm run db:start`
2. **Push Schema to Database**: `npm run db:push`
3. **Seed Database (optional)**: `npm run db:seed`
4. **Inspect Database (Drizzle Studio)**: `npm run db:studio`

### Complete Script Reference (`package.json`)

**App & Quality**:
- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js production bundle
- `npm run start` - Start Next.js production server
- `npm run lint` / `npm run format` / `npm run check` - Biome linter/formatter commands

**Database & Docker**:
- `npm run db:start` - Start PostgreSQL Docker container (`docker compose up -d`)
- `npm run db:stop` - Stop database container (`docker compose down`)
- `npm run db:clean` - Erase all tables and data from database (`tsx scripts/clean.ts`)
- `npm run db:reset` - Clean database, push schema, and re-seed data (`npm run db:clean && npm run db:push && npm run db:seed`)
- `npm run db:logs` - Tail live PostgreSQL container logs (`docker compose logs -f postgres`)
- `npm run db:generate` - Generate Drizzle SQL migration files (`drizzle-kit generate`)
- `npm run db:migrate` / `npm run db:push` - Push Drizzle schema directly to PostgreSQL (`drizzle-kit push`)
- `npm run db:studio` - Open Drizzle Studio visual database UI (`drizzle-kit studio`)
- `npm run db:seed` - Seed database with Super Admin (`trizocommunity@gmail.com`), Ahlussuffa IGS Pro Festival (`Ahlussuffa.igs@gmail.com`), member roles, and pre-event data (`tsx scripts/seed.ts`)
- `npm run db:setup` - All-in-one setup: starts container, pushes Drizzle schema, and seeds database (`npm run db:start && npm run db:push && npm run db:seed`)

## Deployment Options

### Vercel (Recommended)
1. vercel.com → New Project → GitHub repo
2. Add `DATABASE_URL`
3. Deploy ✅

### Railway
1. railway.app → New Project → GitHub
2. Add `DATABASE_URL`
3. Deploy ✅

### Test Locally
```bash
npm run build  # ✓ Clean build (○ / static)
npm start      # ✓ localhost:3000 works
```

## Verification
- **Static Root**: The build output should show `○ /` indicating the root page is static.
- **Build Safety**: The build process should not spam "Shutting down database..." logs.
