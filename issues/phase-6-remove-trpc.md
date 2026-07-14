# Phase 6: Remove tRPC

**Status:** 🔲 TODO

## Goal

Completely remove tRPC from the codebase — packages, source files, and route handlers.

## Steps

### Step 6.1: Remove tRPC Packages from package.json

Remove these dependencies:
```json
"@trpc/client": "^11.18.0",
"@trpc/server": "^11.18.0",
"@trpc/tanstack-react-query": "^11.18.0",
```

Keep ts-rest packages (they may still be in use elsewhere):
```json
"@ts-rest/core": "^3.52.1",
"@ts-rest/react-query": "^3.52.1",
```

### Step 6.2: Delete tRPC Source Directory

```
src/trpc/
```
Delete the entire directory — init.ts, client.tsx, server.tsx, query-client.ts, helpers.tsx, routers/, etc.

### Step 6.3: Delete tRPC Route Handler

```
src/app/api/trpc/
```
Delete the entire `[trpc]/route.ts` directory.

### Step 6.4: Delete Legacy REST Routes

Check for any remaining REST routes not under `/api/v1/` that may have been superseded:

```
src/app/api/auth/
src/app/api/festivals/
src/app/api/students/
... (any other non-v1 routes)
```

Only keep routes under `src/app/api/v1/`.

### Step 6.5: Delete Old ts-rest Contracts (Optional)

```
src/contracts/
```
Check if ts-rest contracts (`src/contracts/auth.contract.ts`, etc.) are still used. If not, delete them.

### Step 6.6: Fix Broken Imports

Run `npm run lint` and fix all broken imports. Common issues:
- Any file still importing from `@/trpc/*`
- Any file still importing from `@/features/*/hooks/use-*` (should have been handled in Phase 4)

### Step 6.7: Verify Build

```bash
npm run build
```

This confirms:
- No type errors from removed packages
- All new route handlers compile correctly
- No missing module errors

## Verification Checklist

- [ ] `@trpc/*` packages removed from `package.json`
- [ ] `src/trpc/` directory deleted
- [ ] `src/app/api/trpc/` route handler deleted
- [ ] No remaining imports from `@/trpc/*` anywhere in codebase
- [ ] `npm run lint` — zero warnings
- [ ] `npm run build` — successful production build
- [ ] All features functional (auth, festivals CRUD, payments, etc.)
