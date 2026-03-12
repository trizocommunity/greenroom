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
| `DATABASE_URL` | Yes | PostgreSQL connection string for **app runtime**, typically the Supabase **connection pooler** URL (e.g. `postgres://user:password@aws-1-...pooler.supabase.com:6543/postgres?pgbouncer=true`). |
| `DIRECT_URL` | Yes (for migrations/seed) | Direct PostgreSQL connection string, typically the Supabase **direct** URL (e.g. `postgres://user:password@aws-1-...supabase.com:5432/postgres`). Used by Prisma migrations and seed. |
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

Example `.env.local` (Supabase):

```text
DATABASE_URL="postgres://YOUR_USER:YOUR_PASSWORD@aws-1-YOUR_PROJECT_REF.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://YOUR_USER:YOUR_PASSWORD@aws-1-YOUR_PROJECT_REF.supabase.com:5432/postgres"
JWT_SECRET=your-secret-at-least-32-chars
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
```

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
