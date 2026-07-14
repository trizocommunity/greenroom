# Phase 1: Extract Zod Contracts

**Status:** ✅ DONE

## Goal

Extract Zod schemas from tRPC routers into `src/api/contracts/[domain].ts`. These contracts are the single source of truth for types shared between route handlers and React Query hooks.

## Contract Files to Create (22)

| # | File | Source Router | Endpoints |
|---|------|--------------|-----------|
| 1 | `src/api/contracts/auth.ts` | `src/trpc/routers/auth.ts` | login, register, logout, me |
| 2 | `src/api/contracts/festivals.ts` | `src/trpc/routers/festivals.ts` | list, get, create, update, delete |
| 3 | `src/api/contracts/students.ts` | `src/trpc/routers/students.ts` | list, get, create, update, delete, bulkCreate, exportExcel, validate |
| 4 | `src/api/contracts/groups.ts` | `src/trpc/routers/groups.ts` | list, create, update, delete |
| 5 | `src/api/contracts/categories.ts` | `src/trpc/routers/categories.ts` | list, create, update, delete |
| 6 | `src/api/contracts/assignments.ts` | `src/trpc/routers/assignments.ts` | list, create, delete, deleteTeam, update, bulkCreate |
| 7 | `src/api/contracts/programmes.ts` | `src/trpc/routers/programmes.ts` | list, get, create, update, delete |
| 8 | `src/api/contracts/judges.ts` | `src/trpc/routers/judges.ts` | list, create, update, delete |
| 9 | `src/api/contracts/members.ts` | `src/trpc/routers/members.ts` | list, add, remove |
| 10 | `src/api/contracts/stages.ts` | `src/trpc/routers/stages.ts` | list, create, update, delete |
| 11 | `src/api/contracts/schedule.ts` | `src/trpc/routers/schedule.ts` | list, create, update, delete |
| 12 | `src/api/contracts/results.ts` | `src/trpc/routers/results.ts` | list, getByProgramme, save, publish, unpublish |
| 13 | `src/api/contracts/notifications.ts` | `src/trpc/routers/notifications.ts` | list, markOneRead, markAllRead |
| 14 | `src/api/contracts/payments.ts` | `src/trpc/routers/payments.ts` | verify, status, history, initiate |
| 15 | `src/api/contracts/billing.ts` | `src/trpc/routers/billing.ts` | unusedCredit |
| 16 | `src/api/contracts/gallery.ts` | `src/trpc/routers/gallery.ts` | list, create, delete |
| 17 | `src/api/contracts/news.ts` | `src/trpc/routers/news.ts` | list, create, update, delete |
| 18 | `src/api/contracts/upload.ts` | `src/trpc/routers/upload.ts` | upload, delete |
| 19 | `src/api/contracts/profile.ts` | `src/trpc/routers/profile.ts` | get, update |
| 20 | `src/api/contracts/my-festival.ts` | `src/trpc/routers/my-festival.ts` | list, get, joined |
| 21 | `src/api/contracts/team-leader.ts` | `src/trpc/routers/team-leader.ts` | list, get, dashboard, studentList |
| 22 | `src/api/contracts/cron.ts` | `src/trpc/routers/cron.ts` | cleanup, expire-sessions, send-reminders |

## Contract Schema Pattern

```typescript
// src/api/contracts/festivals.ts
import { z } from "zod";

export const festivalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  dates: z.object({ start: z.string(), end: z.string() }),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const listFestivalsResponse = z.array(festivalSchema);
export const createFestivalInput = festivalSchema.pick({
  name: true,
  description: true,
  dates: true,
}).extend({
  name: z.string().min(1).max(200),
});
export const updateFestivalInput = createFestivalInput.partial();

export type Festival = z.infer<typeof festivalSchema>;
export type ListFestivalsResponse = z.infer<typeof listFestivalsResponse>;
export type CreateFestivalInput = z.infer<typeof createFestivalInput>;
export type UpdateFestivalInput = z.infer<typeof updateFestivalInput>;
```

## Order of Extraction

1. `_shared.ts` (already done) — id, pagination, dateRange, timestamps
2. `auth.ts` — most used, depends on GlobalRole from session
3. Core domains: `festivals`, `students`, `groups`, `categories`, `assignments`, `programmes`
4. Secondary: `judges`, `members`, `stages`, `schedule`, `results`
5. Support: `notifications`, `payments`, `billing`, `gallery`, `news`, `upload`
6. Access: `profile`, `my-festival`, `team-leader`
7. Internal: `cron.ts`

## Verification

- [ ] All 22 contract files created
- [ ] Each schema exports types (`Festival`, `CreateFestivalInput`, etc.)
- [ ] `npm run lint` — zero warnings
