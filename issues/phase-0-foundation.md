# Phase 0: Foundation

**Status:** ✅ DONE

## Files Created

| File | Purpose |
|------|---------|
| `src/api/contracts/_shared.ts` | Common Zod schemas (id, pagination, dateRange) |
| `src/api/lib/response.ts` | ApiResponse helpers (ok, err, unauthorized, forbidden, badRequest, notFound, internalError) |
| `src/api/lib/create-handler.ts` | Handler factories (createHandler, createProtectedHandler, createAdminHandler, createCronHandler) |
| `src/api/lib/index.ts` | Barrel re-exports |
| `src/api/client/_query-client.ts` | React Query config (copied from tRPC) |
| `src/api/client/index.ts` | Barrel re-exports |

## Folder Structure Created

```
src/app/api/v1/
├── auth/
├── festivals/
├── students/
├── groups/
├── categories/
├── assignments/
├── programmes/
├── judges/
├── members/
├── stages/
├── schedule/
├── results/
├── notifications/
├── payments/
├── billing/
├── gallery/
├── news/
├── upload/
├── profile/
├── my-festival/
├── team-leader/
└── cron/
```

## Handler Factories

- **createHandler** — base factory, decrypts session from cookie, injects `user` into context
- **createProtectedHandler** — wraps createHandler, returns 401 if no user
- **createAdminHandler** — wraps createHandler, returns 401 if no user, 403 if not SUPER_ADMIN
- **createCronHandler** — wraps createHandler, validates `X-Cron-Secret` header against `CRON_SECRET` env var

## Response Envelope

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```
