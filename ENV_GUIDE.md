# Environment Variables Guide

## Required Variables

Copy this to your `.env` file or deployment platform:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
JWT_SECRET="generate-a-secure-random-string-here"

# Payment (Razorpay)
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Production Configuration

### DATABASE_URL for Serverless Platforms

**Important**: Use connection pooling to avoid "too many connections" errors.

#### Supabase
```bash
# Use the "Transaction" pooler connection string from Settings → Database
DATABASE_URL="postgres://postgres.xxxx:password@aws-0-region.pooler.supabase.com:5432/postgres"
```

#### Neon
```bash
# Use the pooled connection string
DATABASE_URL="postgres://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require"
```

#### Railway / Render
```bash
# Add connection parameters
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=1&pool_timeout=0"
```

### JWT_SECRET

Generate a strong random secret:

```bash
# Using OpenSSL  
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Example output:
# JWT_SECRET="XmQq3t6w9z$C&F)J@NcRfUjXn2r5u8x/"
```

### Razorpay Keys

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
2. Copy **Key ID** → `RAZORPAY_KEY_ID`
3. Copy **Key Secret** → `RAZORPAY_KEY_SECRET`

**Test Mode vs Live Mode**:
- Test Mode: `rzp_test_xxxxx`
- Live Mode: `rzp_live_xxxxx`

### Next.js URL

```bash
# Development
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Production
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

## Platform-Specific Setup

### Vercel

```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add RAZORPAY_KEY_ID
vercel env add RAZORPAY_KEY_SECRET
vercel env add NEXT_PUBLIC_APP_URL
```

Or add via Dashboard → Settings → Environment Variables

### Railway

```bash
railway variables set JWT_SECRET="your-secret"
railway variables set RAZORPAY_KEY_ID="your-key"
railway variables set RAZORPAY_KEY_SECRET="your-secret"
railway variables set NEXT_PUBLIC_APP_URL="https://your-railway-url.up.railway.app"

# DATABASE_URL is automatically set by Railway PostgreSQL addon
```

### Render

Add in Dashboard → Environment tab:
- `DATABASE_URL` - Set to your Render PostgreSQL connection string
- `JWT_SECRET` - Generate using command above
- `RAZORPAY_KEY_ID` - From Razorpay dashboard
- `RAZORPAY_KEY_SECRET` - From Razorpay dashboard
- `NEXT_PUBLIC_APP_URL` - Your Render web service URL
- `NODE_ENV` - `production`

## Security Best Practices

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - Use `.env.example` for templates

2. **Rotate secrets regularly**
   - Change JWT_SECRET periodically
   - Rotate database passwords

3. **Use different secrets per environment**
   - Development ≠ Staging ≠ Production
   - Different Razorpay keys for test/live

4. **Restrict database access**
   - Use SSL/TLS for connections
   - Whitelist IP addresses if possible
   - Use read-only users for analytics

## Verification

After setting environment variables:

```bash
# Check database connection
npm run db:migrate:status

# Test health endpoint (after deployment)
curl https://your-domain.com/api/health/db
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "responseTime": "23ms"
}
```
