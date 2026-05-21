# 009 — Team points poster export

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [008](./008-team-points-poster-editor.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §3.2

## What to build

Export team points poster JPEG from **Leaderboard** (and/or results team tab data), using `festival.teamStandings` when set else computed standings from published results.

## Acceptance criteria

- [ ] Button on `src/app/dashboard/[slug]/event-works/leaderboard` client UI: “Download team points poster”
- [ ] `printPosters` gated
- [ ] Data loader reuses logic consistent with `ResultsList.tsx` team standings (prefer shared helper in `poster-bindings.service.ts`)
- [ ] JPEG export via `PosterRenderer` + `TEAM_POINTS` template
- [ ] Toast if no template configured
- [ ] Empty standings → disable export with explanation

## Implementation notes

- If `festival.teamStandings` jsonb shape differs from computed, normalize in bindings service.

## Files (expected touch)

- Leaderboard page/components under `src/app/dashboard` / `src/components/dashboard/event-works`
- `src/features/results/services/leaderboard.service.ts` (read-only reuse)

## Verify

- [ ] Festival with published results shows teams in exported image matching leaderboard order
