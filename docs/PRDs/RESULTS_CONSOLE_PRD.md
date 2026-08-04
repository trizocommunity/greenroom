# Results Console — refined requirement

Status: draft for review
Supersedes: the Results / Announcement Desk / Group Standings three-page flow
Owner: TBD

---

## 1. What this is

Today a result travels through **three pages** before the public sees it:

| Page | File | What it does |
| --- | --- | --- |
| Results | `event-works/results/page.tsx` | "Publish to desk" — sets `result.isPublished`, still invisible publicly |
| Announcement | `event-works/announcement-desk/page.tsx` | "Announce on-air" — sets `result.isAnnounced`, the actual public gate |
| Group Standings | `event-works/group-standings/page.tsx` | Publish team standings, gated behind an announced-count block |

And a festival-level switch (`festival.publicDisplayMode`) makes the public site show **either** programme results **or** standings — never both.

This spec replaces all of that with **two pages** — the **Announcer** (prep + announce) and the **Results** console (published results + standings) — with a single publish action, admin-assigned result numbers, result template selection at announce time, and a public site that shows both results and standings.

---

## 2. Why the current model is being removed

1. **The two-step publish/announce is a distinction without a user.** `isPublished` means "on the desk", `isAnnounced` means "live". Every real flow does both, back to back. One verb — **Announce** — covers the prep-and-publish step.
2. **`publicDisplayMode` makes results and standings mutually exclusive**, so publishing standings *hides* every result already announced. Both should be visible.
3. **The "results per standings" block counter** (`announcerResultsPerStandings`, `announcedProgrammesSinceStandings`) is policy the app enforces on the announcer's behalf. Festivals pace their own standings.
4. **Result numbers exist only as a poster hack.** `poster-bindings.service.ts` fills `resultNo` from the programme code letter, falling back to position. Announcers call out "Result number 34" on the mic — it deserves a real field, and it must be assigned before announcing.

---

## 3. The two pages

### Page A — Announcer (`/event-works/announcer`)

**Purpose:** The prep area. The announcer reviews judgement-completed programmes, assigns a result number, selects a result poster template, previews the result roster, and clicks **Announce** — which makes it public in one step.

### Page B — Results (`/event-works/results`)

**Purpose:** The published-results console. Two sections: published programme results (section 1) and standings (section 2). Admins can view results, unpublish (which returns a programme to the Announcer), swap result numbers, and manage templates.

---

## 4. Page A — Announcer

### 4.1 What it lists

Every programme whose judgement is complete and whose results are **not yet published** (i.e. unpublished programmes only). Programmes appear here when status is `JUDGED`. The moment a result is announced, it leaves this page and moves to the Results console.

### 4.2 List view

A simple list (cards on mobile, rows on desktop):

| Column | Content |
| --- | --- |
| `#` | Result number — editable inline. **Required before announcing.** |
| Programme | Name + category as secondary text + type chip (Individual / Group) |
| Status | `Ready` badge |
| Action | `Open` → opens the full announcer drawer/view |

Sorted by result number ascending; unnumbered programmes sort last.

### 4.3 Result number assignment

Same rules as before:
- **Scope:** unique per festival. Assigned by admins.
- **Default suggestion:** `max(resultNumber) + 1` for the festival when judgement completes.
- **Swap:** entering a number held by another *unpublished* programme offers to swap. Entering a number held by a *published* programme is rejected.
- **Required:** announcing without a number is blocked.

### 4.4 The announcer drawer

Opened from any row. This is where the announcer does all their prep.

**Header:** `#{resultNo} · Programme Name` with category, type chip.

**Template selection area:**
- Shows all published result poster templates for this festival (RESULT-A, RESULT-B, etc.)
- Announcer selects which template(s) to use for this result
- A live **template preview** renders with the result data bound into it (using the existing `buildResultPosterBindings` + Konva canvas)
- The result number (`#{resultNo}`) is prominent on the template

**Result roster** — one row per participant/team, tabular on desktop, cards on mobile:

| Column | Source |
| --- | --- |
| SI No | Row index, 1-based |
| Chest No | `participant.chestNumber` |
| Participant | Name (GROUP: team name + member list) |
| Code Letter | `programme_code_letter` |
| Group | `group.name` |
| Grade | `result.grade` |
| Prize | Derived from `result.position` → 1st / 2nd / 3rd |
| Point | `result.awardPoints ?? result.points` |

Sorted by position ascending, then chest number.

**Footer:**
- Primary **`Announce result`** button. One click makes it public.
- Helper text: *"This publishes result #{resultNo} to the public site and generates the poster."*
- If result number is missing: button disabled with *"Assign a result number first."*
- If no template selected: button disabled with *"Select a result template first."*

**What "Announce result" does:**

```
result.isPublished  = true
result.publishedAt  = now()
result.publishedBy* = actor
programme.status    = PUBLISHED
programme.resultPosterTemplateCode = selectedTemplateCode  (or multi-select stored)
```

One action. No desk. No separate announce step. No display-mode flip.

---

## 5. Page B — Results console

### 5.1 Layout

One page, `/dashboard/[slug]/event-works/results`, a 5-column grid:

```
┌──────────────────────────────────────────┬──────────────────────┐
│  Section 1 — Published Results   (3/5)   │  Section 2 —  (2/5)  │
│                                          │  Standings           │
│  #  Programme          Status    Action  │                      │
│  ──────────────────────────────────────  │  As of Result #12    │
│  13 Mappilappattu      Published  View   │  [Published ▾] [Pub- │
│  12 Group Song         Published  View   │                 lish]│
│  11 Essay Writing      Published  View   │  ──────────────────  │
│  10 Qiraath            Published  View   │  1  Green    142     │
│                                          │  2  Blue     128     │
└──────────────────────────────────────────┴──────────────────────┘
```

- **Desktop (`lg+`):** `grid-cols-5`, section 1 `col-span-3`, section 2 `col-span-2`. Section 2 is `sticky top-*`.
- **Tablet / mobile:** single column, section 1 first, section 2 below. Section 1's table becomes a card list.

### 5.2 Section 1 — Published Results

**Only published results appear here.** No "Ready" queue — that lives on the Announcer page.

Sorted by result number descending (most recently announced first).

**Columns:**

| Column | Content |
| --- | --- |
| `#` | Result number (read-only) |
| Programme | Name + category + type chip |
| Template | Active template code(s) shown as small chips |
| Action | `View` button → opens the result drawer |

**The result drawer (from Results page):**

Same layout as the announcer drawer (header, roster, template preview), but the footer changes:

- **Published-state line:** who published, when.
- **Template management:** can reselect or select multiple templates (RESULT-A, RESULT-B, etc.). Changing template here updates `programme.resultPosterTemplateCode` without affecting published status.
- **Result number swap:** can swap this result's number with another *published* result's number. Both numbers update atomically (single `CASE` statement).
- **Unpublish button** (ADMIN/OWNER only): returns the programme to `JUDGED` status and back to the Announcer page. Keeps the result number.

### 5.3 Section 2 — Standings

Same as previously specified:

**Header controls:**
1. **`As of Result #N`** — highest-numbered published result included.
2. **Scope dropdown:** `All results` (admin truth) / `Published results` (default, matches public).
3. **`Publish standings`** button.

**Body:** Place, Group, Points. Ranked descending by points; ties share a place.

**Publishing:** always snapshots published-results computation. Button disabled while viewing "All results" scope. No gate on count. Republishing overwrites.

---

## 6. Public festival site

| Surface | Rule |
| --- | --- |
| Programme results | Only published results appear. |
| Result posters | Generated from the template selected at announce time. |
| Standings | Only the published standings snapshot. |
| Both together | Both sections render on the same page. No mode switch. |
| Empty states | Standings omitted until a snapshot exists. Results omitted until at least one is published. |

---

## 7. Removals

### 7.1 Pages

| Path | Action |
| --- | --- |
| `event-works/announcement-desk/` | Delete; redirect to `event-works/results` |
| `event-works/group-standings/` | Delete; redirect to `event-works/results` |
| `dashboard/[slug]/announcer/` | Repurposed → becomes the new Announcer page (Page A) |

Both deleted pages get permanent redirects. Remove from sidebar config (lines ~247–260).

### 7.2 Components

- `AnnouncementDeskClient.tsx` — desk concept removed
- `GroupStandingsClient.tsx` — folded into section 2
- `AnnouncerBlockProgressBanner.tsx` — block counter removed
- `TeamResultsDialog.tsx` — "Results per Standings" setting removed
- `PublicDisplayMode` field in `AdvancedSettingsDialog.tsx` and `SettingsForm.tsx`

### 7.3 Actions and services

| Symbol | File | Fate |
| --- | --- | --- |
| `publishProgrammeToDesk` | `announcement.actions.ts` | Replaced by `announceResult` |
| `markProgrammeAnnounced` | `announcement.actions.ts` | Folded into `announceResult` |
| `beginNextResultsBatch` | `announcement.actions.ts` | Delete — no batches |
| `updateAnnouncerResultsPerStandings` | `announcement.actions.ts` | Delete |
| `publishAnnouncedStandings` | `announcement.actions.ts` | Replaced by `publishStandings` (no gate, server-computed) |
| `getAnnouncerBlockProgress` | `announcer-result-count.service.ts` | Delete |
| `countPendingAnnounceSlotsForProgramme` | `announcer-result-count.service.ts` | Delete |
| `getAnnouncementDeskQueue` | `announcement-desk.service.ts` | Delete |
| `getAnnouncerOverviewStats` | `announcement-desk.service.ts` | Delete |

### 7.4 Settings

- **Results per Standings** (`announcerResultsPerStandings`) — removed, no replacement.
- **Public Display Mode** (`publicDisplayMode`) — removed, public site shows both.

---

## 8. Data model changes

### 8.1 `programme`

```sql
ALTER TABLE programme ADD COLUMN result_number integer;

CREATE UNIQUE INDEX programme_festivalId_resultNumber_key
  ON programme ("festivalId", result_number)
  WHERE result_number IS NOT NULL;
```

### 8.2 `result` — collapse the two flags

```sql
UPDATE result
   SET "isPublished" = "isAnnounced";

ALTER TABLE result
  DROP COLUMN "isAnnounced",
  DROP COLUMN "announcedAt",
  DROP COLUMN announced_by_email,
  DROP COLUMN announced_by_name;
```

A result that was on the desk but never announced was not public. Setting `isPublished = isAnnounced` preserves exactly the right semantics.

### 8.3 `festival`

```sql
ALTER TABLE festival
  DROP COLUMN "announcerResultsPerStandings",
  DROP COLUMN "announcedProgrammesSinceStandings",
  DROP COLUMN "publicDisplayMode";

ALTER TABLE festival ADD COLUMN standings_published_at_result_number integer;
ALTER TABLE festival ADD COLUMN standings_published_at timestamptz;
```

`teamStandings` (jsonb) stays.

### 8.4 `programme.status` backfill

```sql
UPDATE programme SET status = 'PUBLISHED' WHERE status = 'ANNOUNCED';
UPDATE programme SET status = 'JUDGED'
  WHERE status = 'PUBLISHED'
    AND NOT EXISTS (
      SELECT 1 FROM result r
       WHERE r."programmeId" = programme.id AND r."isPublished"
    );
```

### 8.5 Poster binding

`resultNo` in `poster-bindings.service.ts` switches from code-letter fallback to `programme.resultNumber`.

---

## 9. New server-action surface

```ts
// Announcer page
setProgrammeResultNumber(festivalId, programmeId, resultNumber)
  → ActionResponse<{ swappedWith?: { programmeId, name, previousNumber } }>

announceResult(festivalId, programmeId, templateCodes: string[])
  → ActionResponse<void>
  // Requires resultNumber + at least one template.
  // Sets isPublished + publishedAt + publishedBy on results.
  // Sets programme.status = PUBLISHED + resultPosterTemplateCode.

// Results page
unpublishResult(festivalId, programmeId)
  → ActionResponse<void>
  // ADMIN/OWNER only. Sets programme.status = JUDGED, result.isPublished = false.
  // Keeps resultNumber. Programme reappears on Announcer page.

swapResultNumbers(festivalId, programmeIdA, programmeIdB)
  → ActionResponse<void>
  // Atomic swap via single CASE statement. Works for published results.

updateResultTemplates(festivalId, programmeId, templateCodes: string[])
  → ActionResponse<void>
  // Update template selection without changing published state.

publishStandings(festivalId)
  → ActionResponse<void>
  // Computes server-side from published results only.
  // Writes teamStandings + standingsPublishedAtResultNumber + standingsPublishedAt.

getStandings(festivalId, { scope: "all" | "published" })
  → server-side computation for section 2's dropdown
```

`publishStandings` taking no standings argument closes the trust hole where the old action accepted an arbitrary client-supplied array.

---

## 10. User flow summary

```
Judgement completes
  ↓
Programme appears on ANNOUNCER page (status: JUDGED)
  ↓
Admin assigns result number (#34)
  ↓
Admin selects result template (RESULT-A)
  ↓
Admin previews: template with result data + result roster
  ↓
Admin clicks "Announce result"
  → result.isPublished = true
  → programme.status = PUBLISHED
  → poster generated with selected template
  → result goes live on public site
  ↓
Programme moves to RESULTS page (section 1)
  ↓
From Results page:
  - View result details
  - Swap result number with another published result
  - Change template selection
  - Unpublish → returns to Announcer page
```

---

## 11. Rules and edge cases

1. **Result number is required to announce, optional to exist.** Judged programmes can sit unnumbered on the Announcer page.
2. **Template is required to announce.** At least one template must be selected.
3. **A published number can be swapped** — but only with another published result, and both numbers update atomically.
4. **Unpublishing keeps the number.** Re-announcing reuses it.
5. **Re-judging a published programme** does not silently change the public site. The row shows a `Republish needed` sub-badge until re-announced.
6. **Standings never go stale silently.** When published results exist beyond the snapshot, section 2 shows how many.
7. **Concurrency.** Two admins announcing at once is fine (idempotent). Same-number race caught by unique index.
8. **Empty states.** No judged programmes → Announcer page empty state points at Judgement. No published results → Results section 1 empty state. Standings section 2 shows zeroed table until snapshot exists.
9. **Polling.** Keep 15s `router.refresh()` on both pages.

---

## 12. Decisions needed

1. **Leaderboard page** — reads `publicDisplayMode` and block counter (both deleted). Keep it and strip dependencies, or fold into the Results console?
   *Assumed: keep, strip dependencies.*

2. **ANNOUNCER role permissions** — can an ANNOUNCER announce (= publish to public), or only prep? Can they unpublish?
   *Assumed: ANNOUNCER can announce. Cannot unpublish (ADMIN/OWNER only).*

3. **Template multi-select** — can the announcer select multiple templates at announce time, or is it always one?
   *Assumed: multi-select allowed. The poster system already supports `publishedTemplateCodes[]`.*

4. **Post-publish edits** — should editing marks auto-update, or require explicit re-announce?
   *Assumed: explicit re-announce required.*

5. **Result-number scope** — per festival or per category?
   *Assumed: per festival.*

6. **Live production data** — does this need to migrate existing festivals mid-event?
   *Assumed: yes, backfills get rehearsed.*

7. **Number swaps on Results page** — the earlier spec restricted swaps to Ready-only. Your requirement says "can swap the result number with another result" on the Results page (published). Confirm: published-to-published swaps are allowed?
   *Assumed: yes, published-to-published swaps allowed on the Results page.*
