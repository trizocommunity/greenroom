# 010 — Posters hub in dashboard settings

**Type:** AFK  
**Tier:** STANDARD + PRO  
**Blocked by:** [004](./004-candidate-card-editor.md), [006](./006-result-poster-editor.md), [008](./008-team-points-poster-editor.md)  
**Harness:** [HARNESS.md](./HARNESS.md) §4.2

## What to build

Single dashboard destination to manage all three poster types: tabs for Candidate card, Result poster, Team points poster — each hosting its editor from issues 004/006/008.

## Acceptance criteria

- [ ] Route: `src/app/dashboard/[slug]/settings/posters/page.tsx`
- [ ] Server gate: `getEffectiveFeatureEnabled(tier, "printPosters")` + festival settings access (`festivalSettings`)
- [ ] Client: `PostersSettingsClient.tsx` with tabs:
  - [ ] 🪪 Candidate Card (1050×600)
  - [ ] 🏅 Result Poster
  - [ ] 🏅 Team Points Poster
- [ ] Sidebar link under Settings (or Festival dashboard sidebar) — “Print posters” / “Poster templates”
- [ ] Each tab shows save status, last updated, link to related export surface (QR Codes / Results / Leaderboard)
- [ ] Respects read-only expired banner via `useFestivalReadOnly`

## Implementation notes

- Match layout of `SettingsForm` / existing settings subpages.
- Icons/copy per harness product table.

## Files (expected touch)

- `src/app/dashboard/[slug]/settings/posters/page.tsx`
- `src/components/festival/posters/PostersSettingsClient.tsx`
- Sidebar component for settings nav

## Verify

- [ ] STANDARD user can open all three tabs and save independently
- [ ] BASIC user cannot access route (redirect/upgrade)
