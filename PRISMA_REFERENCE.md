# Prisma Quick Reference

## Daily Commands

```bash
# Start development
npm run dev

# View database
npm run db:studio

# Check migration status
npm run db:migrate:status

# Create new migration
npm run db:migrate

# Apply pending migrations
npm run db:migrate:deploy

# Validate schema
npm run db:validate

# Regenerate client
npm run db:generate

# Seed database
npm run db:seed
```

## Deployment Checklist

- [ ] Set all environment variables
- [ ] Use connection pooler for DATABASE_URL
- [ ] Run `npm run db:migrate:deploy`
- [ ] Run `npm run db:seed` (if needed)
- [ ] Check `/api/health/db` endpoint

## Environment Variables (Required)

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="generate-secure-random-string"
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://..."
```

## Platform URLs

- **Vercel**: https://vercel.com
- **Railway**: https://railway.app
- **Render**: https://render.com
- **Supabase** (DB): https://supabase.com
- **Neon** (DB): https://neon.tech

## Support Files

- 📖 [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- 🔐 [ENV_GUIDE.md](./ENV_GUIDE.md) - Environment variables guide
- ✅ [walkthrough.md](./walkthrough.md) - What was changed and why

## Health Check

After deployment, verify:
```bash
curl https://your-domain.com/api/health/db
```

Expected: `{"status":"healthy","database":"connected"}`
