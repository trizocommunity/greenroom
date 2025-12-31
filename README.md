# Greenroom - Festival Management

## Local Development
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables
```text
DATABASE_URL=postgresql://postgres:[password]@...
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
