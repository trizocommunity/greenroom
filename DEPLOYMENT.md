# Deployment Guide - Greenroom

This guide covers deploying your Greenroom application to various platforms with proper Prisma database setup.

## Prerequisites

Before deploying, ensure you have:
- A PostgreSQL database (with connection pooling for serverless platforms)
- All environment variables ready
- Prisma migrations tested locally

---

## Environment Variables

All platforms require these environment variables:

```bash
DATABASE_URL="postgresql://user:password@host:5432/database"
JWT_SECRET="your-super-secret-jwt-key"
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

> [!IMPORTANT]
> **For serverless platforms (Vercel, Railway, Render)**, use a **connection pooler** for `DATABASE_URL`:
> - **Supabase**: Use the "Transaction" pooler connection string
> - **Neon**: Use the pooled connection string
> - **Railway/Render**: Add `?connection_limit=1&pool_timeout=0` to your DATABASE_URL
> - **PlanetScale**: Use the connection string as-is (built-in pooling)

---

## Platform-Specific Deployment

### 1. Vercel Deployment

#### Setup Database
1. **Option A - Railway PostgreSQL**:
   ```bash
   railway login
   railway init
   railway add postgresql
   ```
   Copy the `DATABASE_URL` from Railway dashboard

2. **Option B - Supabase**:
   - Create project at [supabase.com](https://supabase.com)
   - Get connection string (Transaction pooler) from Settings → Database

3. **Option C - Neon**:
   - Create project at [neon.tech](https://neon.tech)
   - Get pooled connection string

#### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables (or add in Vercel dashboard)
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add RAZORPAY_KEY_ID
vercel env add RAZORPAY_KEY_SECRET

# Run migrations (from your local machine connected to production DB)
npm run db:migrate:deploy
```

#### Post-Deployment
1. Visit Vercel dashboard → Settings → Environment Variables
2. Verify all variables are set correctly
3. Run seed if needed:
   ```bash
   # Connect to production DB and run seed locally
   DATABASE_URL="your-production-url" npm run db:seed
   ```

---

### 2. Railway Deployment

Railway provides both hosting and PostgreSQL database.

#### Setup
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql
```

#### Deploy
```bash
# Link to service
railway link

# Deploy
railway up

# Set additional environment variables
railway variables set JWT_SECRET="your-jwt-secret"
railway variables set RAZORPAY_KEY_ID="your-key"
railway variables set RAZORPAY_KEY_SECRET="your-secret"

# DATABASE_URL is automatically set by Railway
```

#### Run Migrations
```bash
# Option 1: Run migrations locally against Railway DB
railway run npm run db:migrate:deploy

# Option 2: SSH into Railway and run migrations
railway shell
npm run db:migrate:deploy
npm run db:seed
exit
```

---

### 3. Render Deployment

Render uses `render.yaml` for configuration.

#### Setup Database
1. Go to [render.com](https://render.com)
2. Create new PostgreSQL database
3. Note the connection details

#### Deploy
1. **Using Dashboard**:
   - Connect your GitHub repository
   - Render will detect `render.yaml` and set up services automatically
   - Add environment variables in dashboard

2. **Using CLI**:
   ```bash
   # Install Render CLI (if available)
   # Or use Git-based deployment
   git push origin main
   ```

#### Run Migrations
```bash
# Option 1: Add to build command in render.yaml
buildCommand: npm install && npm run build && npm run db:migrate:deploy

# Option 2: Run via shell
# Go to Render dashboard → Shell tab
npm run db:migrate:deploy
npm run db:seed
```

---

## Database Migration Strategy

### Initial Deployment
```bash
# 1. Ensure migrations are in sync locally
npm run db:migrate

# 2. Deploy application code
# (Platform-specific command)

# 3. Run migrations on production (connected to prod DB)
npm run db:migrate:deploy

# 4. Run seed if necessary
npm run db:seed
```

### Updating Schema
```bash
# 1. Make schema changes in prisma/schema.prisma

# 2. Create migration locally
npm run db:migrate

# 3. Test migration on local DB
npm run db:reset  # Recreates DB with all migrations

# 4. Commit and push changes
git add .
git commit -m "Update database schema"
git push

# 5. Deploy to production
# (Application redeploys automatically)

# 6. Run migrations on production
npm run db:migrate:deploy
```

---

## Health Checks

After deployment, verify database connectivity:

```bash
curl https://your-domain.com/api/health/db
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "responseTime": "45ms",
  "pool": {
    "totalCount": 2,
    "idleCount": 2,
    "waitingCount": 0
  },
  "timestamp": "2024-12-18T..."
}
```

---

## Troubleshooting

### "Too many connections" Error
**Problem**: Database connection limit exceeded (common in serverless)

**Solution**:
1. Use connection pooler URL (Supabase Transaction pooler, Neon pooled URL)
2. Or add connection limit to DATABASE_URL:
   ```
   DATABASE_URL="postgresql://...?connection_limit=1&pool_timeout=0"
   ```
3. Reduce pool size in `src/lib/db.ts`:
   ```typescript
   max: 1,  // For serverless environments
   ```

### "Migration failed" Error
**Problem**: Migration conflicts or database state mismatch

**Solution**:
```bash
# Check migration status
npm run db:migrate:status

# If baseline is needed (first-time production deployment)
npx prisma migrate resolve --applied "migration_name"

# Force reset (⚠️ DESTROYS DATA - dev only)
npm run db:reset
```

### "DATABASE_URL not found" Error
**Problem**: Environment variable not set

**Solution**:
- **Vercel**: Add in dashboard → Settings → Environment Variables
- **Railway**: `railway variables set DATABASE_URL="..."`
- **Render**: Add in dashboard → Environment tab

### Prisma Client Generation Error
**Problem**: `@prisma/client` not found or out of sync

**Solution**:
```bash
# Regenerate Prisma Client
npm run db:generate

# Or during build (should happen automatically via postinstall)
npm install
```

---

## Production Checklist

Before going live:
- [ ] Database backup strategy in place
- [ ] All environment variables configured correctly
- [ ] Migrations tested on staging database
- [ ] Health check endpoint accessible (`/api/health/db`)
- [ ] Connection pooling configured properly
- [ ] Error monitoring set up (Sentry, LogRocket, etc.)
- [ ] DATABASE_URL uses connection pooler
- [ ] JWT_SECRET is strong and unique
- [ ] API rate limiting configured
- [ ] CORS settings reviewed
- [ ] SSL/TLS enabled for database connection

---

## Rollback Strategy

If deployment fails:

### Vercel
```bash
# Revert deployment
vercel rollback
```

### Railway
```bash
# Redeploy previous version via dashboard
# Or rollback migration:
npx prisma migrate resolve --rolled-back "migration_name"
```

### Render
```bash
# Use dashboard to rollback to previous deploy
# Or manually revert via Git:
git revert HEAD
git push
```

---

## Support & Resources

- **Prisma Documentation**: https://www.prisma.io/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Railway Documentation**: https://docs.railway.app
- **Render Documentation**: https://render.com/docs
- **Connection Pooling Guide**: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
