# 008 — Team points poster template editor

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [003](./003-poster-renderer-engine.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §3.2

## What to build

Konva editor for **Team points poster** — separate template row (`TEAM_POINTS`). Supports repeating team rows or fixed number of rank slots.

## Acceptance criteria

- [ ] `src/components/festival/posters/TeamPointsPosterEditor.tsx`
- [ ] Bindings: `festivalName`, `generatedAt`, repeating `teamRank`, `teamName`, `teamPoints` (table or stacked text groups)
- [ ] `meta.maxTeamRows` or dynamic repeat region documented in harness/renderer
- [ ] Save/load `TEAM_POINTS` only — never mixed with `RESULT`
- [ ] Preview uses mock standings (5 teams)

## Implementation notes

- Renderer issue 003 must expand `teamRows` into N Konva text nodes or one multi-line text block — pick one approach and document in PR.

## Files (expected touch)

- `src/components/festival/posters/TeamPointsPosterEditor.tsx`

## Verify

- [ ] Two templates can exist simultaneously: RESULT + TEAM_POINTS with different backgrounds
