# Fix: 401 on GET /api/v1/auth for Unauthenticated Users

## Status: Clarification Needed

## Investigation Summary

The `GET /api/v1/auth` endpoint correctly returns **401 when user is NOT logged in**. This is **expected behavior**, not a bug:

- **File:** `src/app/api/v1/auth/route.ts` (lines 17-26)
- The handler explicitly returns `unauthorized()` when `user` is null
- The client (`useCurrentUser` hook) correctly handles 401 and sets `isError: true`
- Navbar uses `isError` to show logged-out UI

## Clarifying Question

**What behavior do you want when an unauthenticated user hits `GET /api/v1/auth`?**

1. **Return 200 with `null` body** - Don't change status code, just return user as `null`
2. **Suppress console/network log** - Keep 401 but prevent it from appearing in devtools
3. **Different endpoint for auth check** - Create separate `GET /api/v1/auth/status` that returns 200 with `{authenticated: boolean}`
4. **Other** - Please specify

## Impact if Changed to Return 200 with null

If we change the endpoint to return 200 with `null` instead of 401:
- `useCurrentUser` query would resolve with `null` instead of erroring
- `isError` would become `false`, breaking Navbar logic that checks `isError ? null : user ?`
- Would need to refactor all components using `isError` from `useCurrentUser()`

## Files Involved

| File | Role |
|------|------|
| `src/app/api/v1/auth/route.ts` | Auth endpoint handler |
| `src/features/auth/hooks/use-current-user.ts` | Client hook calling the endpoint |
| `src/lib/api-client.ts` | API client `me()` function |
| `src/components/layout/Navbar.tsx` | Uses `isError` to conditionally render |

## Blocking

Waiting for clarification on desired behavior.
