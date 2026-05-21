# 006 — Result poster template editor

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [003](./003-poster-renderer-engine.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §3.1

## What to build

Konva editor for **Result poster** template: winner slots (configurable count, default 3), programme/category title fields, background upload, save as `RESULT` type.

## Acceptance criteria

- [ ] `src/components/festival/posters/ResultPosterEditor.tsx`
- [ ] Configurable `winnerSlotCount` (1–10) stored in template `meta`
- [ ] Bindings: `festivalName`, `programmeName`, `categoryName`, `winner1Name` … `winnerNName` (+ optional team, grade, points per slot)
- [ ] Save/load via poster template actions (`type: RESULT`)
- [ ] Live preview uses mock winner data
- [ ] Separate from team points template (must not read `TEAM_POINTS` row)

## Implementation notes

- Editor UX: number input “Winner slots” updates placeholder layers on stage.
- Align naming with `poster-bindings.service.ts` from issue 003.

## Files (expected touch)

- `src/components/festival/posters/ResultPosterEditor.tsx`

## Verify

- [ ] Save + reload preserves slot count and positions
- [ ] Preview shows 3 mock winners when `winnerSlotCount: 3`
