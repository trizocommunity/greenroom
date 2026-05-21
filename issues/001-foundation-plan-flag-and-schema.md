# 001 — Foundation: plan flag, schema, types

**Type:** AFK  
**Tier:** STANDARD + PRO (BASIC: off)  
**Blocked by:** None — start here  
**Harness:** [HARNESS.md](./HARNESS.md) §2, §5.1

## What to build

Add the `printPosters` feature flag to tier config and create the `festival_poster_template` Drizzle table with TypeScript types. No UI yet — only config + migration + enums.

## Acceptance criteria

- [ ] `printPosters: boolean` added to `TierFeatures` in `src/config/pricing.ts`
- [ ] `printPosters: true` for **STANDARD** and **PRO**; `false` for **BASIC**
- [ ] Feature registered in `src/config/plan-features.config.ts` (key + human label)
- [ ] `useFeature` / plan-features tags updated if the project lists feature keys centrally (e.g. `features-tags.ts`)
- [ ] Drizzle table `festival_poster_template` with columns at minimum:
  - `id`, `festivalId`, `type` (enum: `RESULT` | `TEAM_POINTS` | `CANDIDATE_CARD`)
  - `width`, `height` (integers)
  - `konvaJson` (jsonb)
  - `backgroundUrl` (text, nullable)
  - `meta` (jsonb, nullable) — e.g. `{ winnerSlotCount: 3 }`
  - `createdAt`, `updatedAt`
- [ ] Unique index on `(festivalId, type)`
- [ ] Foreign key `festivalId` → `festival.id` cascade delete
- [ ] SQL migration file under `drizzle/`
- [ ] Types exported from `src/features/posters/types/poster-template.types.ts`

## Implementation notes

- Follow existing `pgEnum` / `pgTable` style in `src/core/database/schema.ts`.
- Candidate card default dimensions in seed/default meta: **1050 × 600**.
- Do not wire pages or actions in this issue.

## Files (expected touch)

- `src/config/pricing.ts`
- `src/config/plan-features.config.ts`
- `src/core/database/schema.ts`
- `drizzle/*.sql`
- `src/features/posters/types/poster-template.types.ts` (new)

## Verify

- `npm run check` (or project lint/typecheck) passes
- `drizzle-kit generate` / migration consistent with team process
