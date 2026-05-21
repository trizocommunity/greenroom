# 002 — Template CRUD + background storage

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [001](./001-foundation-plan-flag-and-schema.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §4.3, §4.5

## What to build

Server actions to load/save/delete poster templates per festival and type, including optional background image upload that respects festival storage limits.

## Acceptance criteria

- [ ] `src/features/posters/repositories/poster-template.repository.ts` — findByFestivalAndType, upsert, delete
- [ ] `src/features/posters/actions/poster-template.actions.ts`:
  - [ ] `getPosterTemplateAction(festivalId, type)`
  - [ ] `savePosterTemplateAction(festivalId, type, payload)` — konvaJson, dimensions, meta, backgroundUrl
  - [ ] `deletePosterTemplateAction(festivalId, type)` (optional but recommended)
- [ ] All actions: `assertFestivalAccess`, `getEffectiveFeatureEnabled(tier, "printPosters")`, reject when false
- [ ] Respect festival read-only / expired (use same writable guard as other mutation actions)
- [ ] Background upload path integrates with existing storage/upload pattern (gallery or festival branding upload — match whichever the codebase uses for `festival.branding` / gallery images)
- [ ] On background save, increment/check `storageUsedMB` via `StorageUsageService` + tier limits
- [ ] `revalidatePath` for posters settings route (path added in 010; can use placeholder path `/dashboard/[slug]/settings/posters`)

## Implementation notes

- Upsert on `(festivalId, type)` — never store team points and result templates in one row.
- Validate `type` enum server-side with Zod.
- Cap `konvaJson` size (reasonable max, e.g. 2MB) to avoid abuse.

## Files (expected touch)

- `src/features/posters/**` (new)
- Possibly existing upload helper under `src/features/festivals` or gallery

## Verify

- Manual: call actions from a temporary script or unit test if project has action test patterns
- Unauthorized tier (BASIC) receives clear error
