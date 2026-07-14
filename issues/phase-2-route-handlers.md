# Phase 2: Route Handlers

**Status:** ✅ DONE

## Goal

Implement `src/app/api/v1/[domain]/route.ts` for all 22 domains using the handler factories from Phase 0 and contracts from Phase 1.

## Route Handlers to Create (22)

| # | Handler | HTTP Methods | Auth Level |
|---|---------|-------------|-----------|
| 1 | `src/app/api/v1/auth/route.ts` | GET, POST | mixed (login/register public, me/logout protected) |
| 2 | `src/app/api/v1/festivals/route.ts` | GET, POST | protected |
| 3 | `src/app/api/v1/students/route.ts` | GET, POST | protected |
| 4 | `src/app/api/v1/groups/route.ts` | GET, POST | protected |
| 5 | `src/app/api/v1/categories/route.ts` | GET, POST | protected |
| 6 | `src/app/api/v1/assignments/route.ts` | GET, POST, DELETE | protected |
| 7 | `src/app/api/v1/programmes/route.ts` | GET, POST | protected |
| 8 | `src/app/api/v1/judges/route.ts` | GET, POST | protected |
| 9 | `src/app/api/v1/members/route.ts` | GET, POST, DELETE | protected |
| 10 | `src/app/api/v1/stages/route.ts` | GET, POST | protected |
| 11 | `src/app/api/v1/schedule/route.ts` | GET, POST | protected |
| 12 | `src/app/api/v1/results/route.ts` | GET, POST | protected |
| 13 | `src/app/api/v1/notifications/route.ts` | GET, POST | protected |
| 14 | `src/app/api/v1/payments/route.ts` | GET, POST | protected |
| 15 | `src/app/api/v1/billing/route.ts` | GET | protected |
| 16 | `src/app/api/v1/gallery/route.ts` | GET, POST, DELETE | protected |
| 17 | `src/app/api/v1/news/route.ts` | GET, POST, PUT, DELETE | protected |
| 18 | `src/app/api/v1/upload/route.ts` | POST, DELETE | protected |
| 19 | `src/app/api/v1/profile/route.ts` | GET, PUT | protected |
| 20 | `src/app/api/v1/my-festival/route.ts` | GET | protected |
| 21 | `src/app/api/v1/team-leader/route.ts` | GET | protected (team leader role) |
| 22 | `src/app/api/v1/cron/route.ts` | GET | cron (X-Cron-Secret) |

## Handler Pattern

```typescript
// src/app/api/v1/festivals/route.ts
import { createProtectedHandler, ok, badRequest, notFound, forbidden } from "@/api/lib";
import { createFestivalInput, updateFestivalInput } from "@/api/contracts/festivals";
import { createFestival, findFestivalById, updateFestival, deleteFestival, findAllFestivals } from "@/core/db";
import { festivalsTable } from "@/core/db/schema";
import { eq } from "drizzle-orm";

const handler = createProtectedHandler({
  async GET({ user }) {
    const where = user!.role === "SUPER_ADMIN"
      ? undefined
      : eq(festivalsTable.ownerId, user!.userId);
    const festivals = await findAllFestivals(where);
    return ok(festivals);
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createFestivalInput.safeParse(data);
    if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);
    const festival = await createFestival({ ...parsed.data, ownerId: user!.userId });
    return ok(festival);
  },
});

export const GET = handler;
export const POST = handler;
```

## Auth Level Mapping

| tRPC Procedure | Handler Factory |
|----------------|----------------|
| `publicProcedure` | `createHandler` (no auth check) |
| `protectedProcedure` | `createProtectedHandler` |
| `adminProcedure` | `createAdminHandler` |
| `internalProcedure` | `createCronHandler` |

## Validation Pattern

```typescript
const parsed = schema.safeParse(body.data ?? body);
if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);
```

## Error Response Pattern

```typescript
// 401 Unauthorized
return unauthorized();

// 403 Forbidden
return forbidden();

// 400 Bad Request
return badRequest("INVALID_INPUT", "Name is required");

// 404 Not Found
return notFound("NOT_FOUND", "Festival not found");
```

## Verification

- [ ] All 22 route handlers implemented
- [ ] Each handler validates input with Zod schema from contracts
- [ ] Appropriate auth checks (protected vs admin vs cron)
- [ ] `npm run lint` — zero warnings
