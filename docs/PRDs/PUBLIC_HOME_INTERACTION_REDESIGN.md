# The Public Festival Home — Interaction Redesign

**Surface:** `src/app/(festivalPublic)/[slug]/page.tsx` and the hero above all else
**Constraint given:** the design system stays; add interaction, not content
**Status:** design spec, nothing built

---

## 1. Diagnosis

I read every component on this page, every SSE channel behind it, and the loaders under both. One sentence covers what's wrong:

> **The page is a directory of other pages.** Every section ends in a link out. Nothing ends in an action.

Count them. Hero → "View results", "Schedule". Standings → "Full standings". Winners → "All results". News → "All news". Media → "Gallery". Five sections, five exits, zero places to *stand*. A visitor who arrives during the festival — which is when nearly all of them arrive — has nothing to do here except leave for somewhere else on the same site.

The second finding is worse, because it means the fix is already paid for:

> **The three things this system knows in real time are each fetched, typed, and thrown away one line before they reach the screen.**

- `HeroSection.tsx:57-70` opens an SSE connection, receives `{daysToStart, daysToEnd, daysToExpire, tickedAt}`, and calls `router.refresh()`. The payload is discarded. Then `:77-83` adds a 60-second interval doing the same thing again.
- `TeamStandingsSection.tsx:57-72` receives the **complete new leaderboard** — every team, every point total, the programme/general split, the itemised general entries — and its own comment says "We don't re-render the board from the payload directly." It calls `router.refresh()`.
- The `announce` channel fires on every result. The STANDARD/PRO home page does not subscribe to it at all.

The infrastructure for a live festival site is built, tested, and running in production right now. It is wired to a refresh call. Everything below is mostly a matter of *rendering the data that already arrives*.

Third finding, the one that decides the shape of the redesign:

> **A visitor to a kalolsavam is not a neutral observer. They came for one team, or one child, or one programme.** The page treats all fifteen teams as equally interesting to everybody. It is a scoreboard for nobody.

And the smaller things that add up:

| | |
|---|---|
| `HeroSection.tsx:36` | `isLive = festival.status === "ACTIVE"` — the enum is `READY \| ONGOING \| PAST \| EXPIRED`. The "Live now" pulse has never rendered on any festival, ever. |
| `HeroSection.tsx:176-182` | The facts row is a `<dl>` of `<dd>`s with no `<dt>`. Invalid. `key={fact}` collides on duplicate strings. `participantsCount` is in the array and never populated. |
| `HeroSection.tsx:38-46` | Two `useDeadlineWindow` calls computed and never rendered. `WindowStatusBadge` at `:241` is defined and never called. |
| `HeroSection.tsx:206-239` | The two links have `hover:opacity-90` and a hover arrow nudge. On a phone — the majority of this traffic — the only two interactive elements on the hero give **zero** feedback to a finger. |
| `TeamStandingsSection.tsx:196-202` | Bars animate `whileInView` with `viewport={{once: true}}`. The one motion channel that could carry a rank change is flagged off after first paint. |
| `TeamStandingsSection.tsx:142` | Standings rows are inert `<li>`. Not links, not buttons. No way to ask "why are we fourth". |
| `LatestWinners.tsx` | Three rows and ~65 lines of pagination that can never run (`limit: 3`, `pageSize = 3`, so `totalPages` is always 1). Rows aren't tappable. |
| `drawer.tsx` (vaul) | ~28 dashboard consumers. **Zero** on the public site. The one detail view the public site has uses a centred `Dialog`, which is the wrong container on a phone. |
| `.mask-fade-x`, `.animate-sheen` | Defined in `globals.css`, zero consumers. |
| Instrument Serif (`font-display`) | Used in exactly one place on the entire public site — a generated news thumbnail. A free expressive lever, untouched. |

None of these are the problem. The problem is the first sentence. These are what you find when nobody has looked closely, and they're cheap to sweep up while you're in there anyway.

---

## 2. The organising idea

**The home page should be a place you stand during the festival, not a lobby you pass through on the way to a results table.**

Concretely, three commitments:

1. **Pick a side, and the page becomes yours.** One tap in the hero. From then on the standings tint, your row pins, your wins get confetti and everyone else's don't, and the hero's dead facts row becomes a live line about *your* team.
2. **Render the payload, never refresh.** Every `router.refresh()` on this page is deleted. The board moves because the board received new numbers, not because the page reloaded. (This is also a correctness fix — see §6.)
3. **Everything you can see, you can take.** A win becomes a shareable card. A team becomes a link that arrives pre-tinted. A stage becomes a QR. The festival's most valuable output is a photo of a name, and right now the audience cannot get one.

The name for the central artifact: **The Line**. One slot in the hero, one fixed height, four states. It is where the whole redesign lands.

---

## 3. The hero, redesigned

### 3.1 What changes structurally

Nothing moves. The h1 stays where it is at the same size, the tagline stays, the accent hairline stays, the two CTAs stay. Three slots change character:

| Slot | Today | Becomes |
|---|---|---|
| Above the h1 (`:139-150`) | Dead "Live now" badge | **The Stage Strip** — what's on stage right now, tappable |
| Under the hairline (`:176-182`) | Invalid `<dl>` of dead facts | **The Line** — your team, live |
| The hairline itself (`:166-175`) | Animates once on mount | **The Pulse Rule** — flashes when a result lands |
| The two CTAs (`:206-239`) | `hover:` only | Press states — ink, give, haptic |

The date and location facts don't disappear — they demote to a 12px right-aligned run beside the CTAs, where facts belong. **No new content enters the hero.** One dead row becomes one live row; one dead badge becomes one live strip.

### 3.2 Desktop wireframe — mood C (festival live, allegiance set)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⬤  Sadbhavana Kalotsavam        Home  News  Media  Schedule  Results   Login    │  navbar h-16
├──────────────────────────────────────────────────────────────────────────────────┤
│  ● 3 days left                                                    [ sticky bar ] │
└──────────────────────────────────────────────────────────────────────────────────┘

     ╭────╮
     │ ⬤  │   ● ON STAGE   Group Song (Senior) · Main Stage           ends in 11:04  │ ①  40px
     ╰────╯

     Sadbhavana Kalotsavam '25                                                        ② h1 7xl

     Where the district sings.                                                        ③

     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     ④ pulse rule

     ⬤ Sreekrishna    ·    4th    ·    128 pts          ┌ ↑ 5 pts ┐                   ⑤ THE LINE  56px
     41 results announced · latest 4 min ago                        watching 2  ›     ⑥ 11px micro-line

     (  View results  → )    Schedule →              Feb 12–14, 2025 · Kozhikode      ⑦ CTAs + demoted facts
```

### 3.3 390px wireframe — mood C

```
┌────────────────────────────────┐
│ ⬤ Sadbhavana Kalot…        ☰   │
├────────────────────────────────┤
│ ● 3 days left                  │
└────────────────────────────────┘

  ⬤

  ● Group Song (Sr) · 11:04  ›     ① 40px, name truncates, time never does

  Sadbhavana
  Kalotsavam '25                   ② 2.5rem

  Where the district sings.        ③

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ④

  ⬤ Sreekrishna · 4th · 128        ⑤ whole line is a 44px target → change-team sheet
  41 results · 4 min ago      2 ›  ⑥

  (      View results  →      )    ⑦ full-width pill
    Schedule →

  Feb 12–14 · Kozhikode            demoted, 12px, muted
```

### 3.4 The Line — anatomy

One slot. **One fixed height at every breakpoint** (56px desktop, 52px mobile) so that no state transition ever shifts the page. This matters more than it sounds: the hero is above the fold, and a slot that grows when SSE connects is a layout shift on every visit.

**Mood A — no allegiance chosen (first visit, any phase)**

```
  PICK YOUR SIDE
  ( Sreekrishna )( Karunya )( Vidya )( Snehatheeram )( Prathibha ) →→→
```

A horizontally scrollable rail of 44px `rounded-full` chips, one per team, ordered by current rank, border-only at rest. `.mask-fade-x` for the edge fade (finally a consumer), `.scrollbar-hide`, CSS scroll-snap. A small `×` writes `{team: null, dismissed: true}` so a visitor who declines is never asked again.

This works on **day zero, before a single result exists**, because `festival-public.loader.ts:102-115` merges every `group` row in at zero points and re-ranks. Every team name is present from the moment the festival is created.

**Mood B — allegiance set, festival not started**

```
  ⬤ Sreekrishna   ·   doors open Friday, 9:00 am            change ›
  86 programmes · 14 teams
```

**Mood C — allegiance set, festival live** (the shape above). Rank glyph flips, points count up, `↑ 5 pts` chip arrives and expires.

**Mood D — post-festival**

```
  ⬤ Sreekrishna   ·   finished 2nd   ·   241 pts           see the run ›
  312 results · closed 14 Feb
```

`see the run ›` opens the rewind rail (§4.2) scrubbed to result #1. The archive becomes something you replay rather than something you read.

**Choosing writes to `localStorage` under `gr:allegiance:{slug}`**, mirroring `src/lib/participant-session-storage.ts`. No account, no backend, no PII. On commit, `sonner` confirms with an **Undo** action.

### 3.5 The Line — interaction spec

| Element | Behaviour | Motion | Reduced-motion |
|---|---|---|---|
| Chip → committed row | `layoutId="allegiance-chip"`, the chosen chip physically flies into the row slot | House spring `{stiffness: 400, damping: 34}` — the exact numbers already at `FestivalNavbar.tsx:126-130` | Rail crossfades to the row, 120ms opacity only |
| Unchosen chips | Fade out, then rail height collapses | `opacity → 0` 180ms, then `height auto → 0` 220ms ease-out | Instant |
| Rank glyph | Slot-machine flip on the **single digit only**, not the line | `AnimatePresence mode="popLayout"`, out `y 0→-10 opacity→0`, in `y 10→0 opacity 0→1`, 240ms `[0.22, 1, 0.36, 1]` | Value set directly |
| Points | Counts to the new value | `useSpring {stiffness: 90, damping: 20}`, rendered `tabular-nums` so the line never reflows mid-count | Set directly |
| `↑ 5 pts` chip | Appears beside the points, expires | 200ms in, **hold 3000ms**, 300ms out | **Hold 5000ms** — a longer dwell compensates for the absence of motion drawing the eye |
| Whole row | 44px tap target → change-team `vaul` sheet (bottom sheet on mobile, right panel ≥640px, both free from `drawer.tsx`) | vaul's own spring | vaul's reduced path |
| Chips | `:active` scale 0.97 / 80ms | — | Keep the tint, drop the scale |

**No hover state is required anywhere in this mechanic.** Rest, `:active`, committed. That's the whole state machine, and it is the same on a phone and a desktop.

The micro-line ⑥ is driven by the `results-count` channel, which already publishes `{festivalId, count, lastResultAt}` on every announcement (`announcer.actions.ts:330-334`) and is rendered nowhere. Relative time via `date-fns`, already a dependency.

**Accessibility.** The Line is `aria-live="polite"` and announces the composed sentence (`"Sreekrishna, 4th, 128 points, up 5"`), not the individual digits — otherwise a screen reader reads a slot machine. `aria-atomic="true"`. Long Malayalam team names use `leading-normal`, **not** the h1's `leading-[1.02]`, which clips conjuncts. `truncate` + `min-w-0` so a long name degrades before the rank does.

### 3.6 The Stage Strip ①

Replaces the badge that has never rendered. Accent dot + stage name + programme title (truncated) + a locally-ticking remaining time.

Tap: it expands **in place** (framer `layout`, height auto, 320ms `[0.22, 1, 0.36, 1]` — the house hero curve already at `HeroSection.tsx:124`) into three rows: now, next, next+1, each with its stage. Tap a stage name inside and you get **Stage Door**: a `vaul` sheet with that stage's remaining day, an accent `NOW` hairline slotted *between* the last-finished and next rows, and — the actual point — `stage.description` rendered as the directions line.

Organisers already type *"Behind the main block, next to the canteen"* into that field for their own staff. It is a plain text column, it comes back on **every** `getScheduleEntriesPublic` call today, and it has never once been shown to a visitor. Zero new backend. If empty, the line is simply omitted.

The clock ticks locally at 1s. It cannot come from the countdown channel, because that channel is a `cron: "0 0 * * *"` daily job despite its name.

### 3.7 The Pulse Rule ④

The accent hairline already draws itself in on mount (`scaleX 0→1`, 800ms). Give it a second job: when the `announce` channel fires, it flashes — `scaleY 1→3→1` over 160ms, plus a `gr-sheen` sweep retimed to 1100ms linear, one iteration.

This is the cheapest live tell on the page. It costs one keyframe and it means a visitor who is looking at the hero *sees the festival move* without a toast, a badge, or a sound.

### 3.8 The CTAs ⑦ — the press system

The public site currently has no `:active` state anywhere. Establish one here and let the rest of the site inherit it.

- **GIVE** — `pointerdown` compresses to `scale 0.965` over 90ms ease-out. Release springs back `{stiffness: 420, damping: 14, mass: 0.8}`, overshooting to ~1.012. That overshoot is the entire difference between *sprung* and *clicked*.
- **INK** — a radial in the festival accent spawns at the exact `pointerdown` coordinates and expands to fill, clipped by `rounded-full` + `overflow-hidden`. `scale 0→24` over 520ms `cubic-bezier(0.16, 1, 0.3, 1)`, `opacity 0.55→0` across the final 60%.
- On the **secondary** link the same gesture instead wipes a 1px accent underline outward from the touch x — same language, lighter weight, so the hierarchy survives.
- Reduced motion: keep the ink as an instant 90ms tint, drop the scale and the expansion. Tactile feedback survives even when movement doesn't.

---

## 4. The interaction layer, section by section

### 4.1 Standings — **The Board Moves**

The single highest value-per-line change on the page.

Delete the `router.refresh()` at `TeamStandingsSection.tsx:69-72`. Hold `TeamStandingRow[]` in state seeded from the server render. On each SSE frame, diff the incoming array by `name` to derive `{pointsDelta, rankDelta}` per row, then set state. Rows become `<motion.li layout>` inside a `<motion.ol layout>` and framer does the reorder.

**This is a correctness fix, not a preference.** `announceResult` never calls `invalidatePublicFestivalCaches` (the helper exists and is wired to settings/news/media writes, but not to announcements) while `getPublicFestivalData` is `cache.wrap`ed with a 5-minute TTL. So today: the SSE fires instantly, `router.refresh()` runs, and the board repaints numbers **up to five minutes stale**. Payload-driven state is instantly correct. A refresh is not.

Motion:
- **Reorder** — house spring `{400, 34}`, settles ~450ms.
- **Points** — digit wheel old→new, 600ms `[0.22, 1, 0.36, 1]`, `tabular-nums`.
- **Bar width** — 700ms ease-out on **every** change. This requires dropping `viewport={{once: true}}` at `:196-202`, which is precisely the flag that kills the only motion channel capable of showing a rank change today.
- **Rank-up row** — 1px accent left edge wipes in `scaleY 0→1` over 240ms, holds 3000ms.
- **Delta chip** `+6` — in 180ms, hold 2400ms, out 400ms.
- **Reduced motion** — `layout` disabled entirely, rows jump to their new order, the delta chip and the accent edge do all the work and hold longer.

**The Lens.** Your team's bar fills at full accent opacity; every other bar drops from 0.45 to 0.22. The board reads as one bright line among greys. When your row falls outside the visible slice, a `position: sticky; bottom: 0` clone docks to the bottom of the list — 56px, tappable to scroll the real row into view, above the safe-area inset.

On a 390px screen fifteen rows do not fit and paging to find yourself is the current failure mode. The sticky row is the whole point of the section on a phone.

**Press to Peek.** Rows stop being inert. Tap → a `vaul` sheet with that team's breakdown: programme points vs general points, and the itemised `generalEntries` list with category and points per entry. Long-press (450ms) instead inflates the row **in place** while held, so you can press one team, release, press another, and compare without ever losing your scroll position.

Zero new backend for either. `TeamStandingRow` already carries `programmePoints`, `generalPoints`, and `generalEntries[{id, name, categoryName, points}]`. It is on the page already, and it arrives again in full in every SSE frame. It has never been rendered.

This is the site's first real answer to *"why are we fourth?"*

### 4.2 Standings — **Rewind the Festival**

A 44px rail beneath the board header. Appears once there are ≥3 announced results.

`programme.resultNumber` is a monotonic public integer that both the `announce` and `results-count` channels already carry. The festival therefore has a natural timeline: result #1 … #N. **The rail is that timeline.** Drag the handle to #37 and the board re-renders as it stood the instant result 37 was announced. Release and it springs forward to live, rows flying back to their current order.

This answers the question every team at a kalolsavam asks and the product currently cannot: *when did we lose the lead?*

- Drag: same `layout` reorder, stiffer for finger-responsiveness — `{stiffness: 520, damping: 38}`.
- Points do **not** roll while scrubbing. They interpolate via `useMotionValue` + `useTransform` (rounded) with ~90ms lag, so the digits feel *dragged* rather than animated.
- Release: 500ms return to live, plus a single 300ms accent flash on the live indicator to confirm you're back in the present.
- Snapshots past #N are immutable → cache-forever safe. Prefetch in buckets of 5 ahead of the thumb's direction, debounce at 120ms.
- `touch-action: none` scoped **strictly to the handle** so vertical page scroll still works everywhere else on the row.
- Reduced motion: the rail still drags (user-driven), but each snapshot is a hard cut and a persistent text readout carries the state.

This is the only concept here needing a genuinely new endpoint — and even that is a wrapper, because `computeStandings(festivalId, 'published', upToResultNumber)` already exists and already takes exactly the parameter required.

**Caveat, stated plainly:** this concept and the two below scored 9.0 from a single reviewer — the two other judges on that batch died on an API quota error and never ran. I've kept it because the data argument is verifiable in the source, but it is the least-vetted item in this document and it is the largest. Build it last, or not at all.

### 4.3 Winners — **The Win Card**

Every winner row becomes tappable. Opens a `vaul` sheet — not the centred `Dialog` that `ResultsList` uses, which is wrong on a phone.

Two layers:

- **Fast layer, pure DOM, renders instantly.** The winner's name in `font-display` (Instrument Serif — used once on the entire public site, so it reads as an event rather than as furniture), the festival accent as a full bleed, programme / position / team beneath, the festival logo, and a `qr-code-styling` QR in the accent pointing at the deep link.
- **Take layer, the existing pipeline.** `getPublicResultPosterPayloadAction(programmeId, slug)` is already public and unauthenticated, gated only on the programme having a published result. It feeds `PosterExportCanvas`, exports via `stage.toDataURL({pixelRatio: 2})`, and hands the file to `navigator.share({files: [file]})` exactly as `ResultPosterActions.share()` already does.

The card renders at **4:5**, because that is what Instagram and WhatsApp status crop to.

The whole capability ships today and the audience has no route to it. This is the largest gap between what the product can do and what the product offers.

**Hold to Take It** is the same payload behind a different gesture: hold a winner row, an SVG ring draws around the press point over 550ms **linear** (a progress ring must read as elapsed time, not as a flourish), lift early and it retracts with no penalty, complete it and you get a haptic and the sheet.

### 4.4 Global — **The Drop**

One always-mounted client component subscribing to the `announce` channel, which the STANDARD/PRO home page does not subscribe to at all today. Two branches:

**Not yours** — the Pulse Rule flashes (§3.7), and the new result slides into the top of the winners list carrying a relative timestamp derived from `startedAt`, a field that arrives in every payload and is rendered nowhere. The row holds a faint accent background that decays from 12% to 0% over 6000ms via `color-mix`. *Fresh* becomes a state that visibly expires, with no badge required.

**Yours** — the winning team matches your allegiance, or the `programmeId` matches your watch list. A `sonner` toast fires, tinted with the accent, naming the programme and position, with exactly one action: **Get the card**. Simultaneously `party-js` bursts **from the DOM node of the row itself**, so the celebration is anchored to the name rather than raining from the top of the window.

> `party-js` is installed and fires in four places today. Every one of them is admin-facing. **The organiser who types in the result gets confetti; the child who won gets an `<li>`.** Route it at the audience.

Guards, all non-optional:
- Confetti capped at 28–40 particles, and **skipped entirely** when `navigator.hardwareConcurrency <= 4`. This audience is on low-end phones on congested venue wifi.
- `pointer-events: none`; nothing ever steals focus.
- Reduced motion: no confetti, no vibration. Guard on `matchMedia` exactly as `FestivalLiveClient.tsx:255` already does in this repo. The row wash becomes a static accent left edge.
- A **Live** pill in the section header toggles toast + confetti + haptics together, written to `localStorage` per slug and honoured on first paint. It's visible before the first toast ever fires, so the escape hatch is discoverable *before* it's needed.
- `sonner` is already configured top-center on mobile, which keeps the toast clear of the thumb and of the sticky countdown banner.

### 4.5 Global — **Watch This One**

Store watched `programmeId`s in `localStorage` per slug. The `announce` payload already carries `programmeId`, so the match happens entirely client-side: **zero backend, zero polling, zero PII.** A bell on every not-yet-announced programme in the stage strip and on every row in `ResultsList`; a `watching 2 ›` counter in The Line opens a sheet to manage them.

This is the only mechanic in the set that lets someone leave a tab open on the group-song result *specifically* — which is the actual job-to-be-done for a parent, and the one the page currently answers with "go to another page and use the search box there."

When a watched result lands, its row holds its accent edge for **6000ms** rather than the unwatched 3000ms. This one is theirs.

Named upgrade path, deliberately out of scope: `serwist` already ships a service worker and every festival already serves a per-festival manifest, so this could become a real push notification later. Not now — push permission is a product decision, not a design one.

### 4.6 Global — **Send It To The Group**

The smallest concept here and the one that makes the other seven spread.

The committed allegiance row gains a share action producing a link with `?team=<slug>`, built through `useFestivalLinkBase` so it is correct on a custom domain. `page.tsx` reads that param **server-side** and passes the pre-selected team into the tree, so the recipient's *first server-rendered paint* is already tinted, already re-ordered, already showing the sticky you-row. On mount the client persists it and cleans the param out of the URL with `history.replaceState`.

This solves a technical problem as much as a social one: every `localStorage`-driven personalisation flashes unpersonalised content on first paint, and a URL param is the only way to have the server get it right the first time.

Alongside the link, a `qr-code-styling` QR in the accent encoding the same URL — 240px, high error-correction so it scans off a screen at an angle in bad hall lighting, rendered on a **solid** background rather than the accent so contrast survives a dark accent colour in dark mode.

For the *recipient*, the arrival is deliberately **not animated at all**. The tinted state is server-rendered and simply there. Animating a state the visitor did not choose reads as a glitch, not a welcome.

---

## 5. Motion system additions

Everything below goes in `globals.css`. Note the last block especially.

```css
/* --- in @layer utilities, beside .animate-pulse-dot --- */

/* Hero rule flash — fires once when a result lands. */
.animate-rule-flash {
  animation: gr-rule-flash 160ms ease-out 1;
}

/* One-shot sweep. Reuses the existing gr-sheen keyframe, retimed:
   the infinite .animate-sheen is a decoration, this is an event. */
.animate-sheen-once {
  animation: gr-sheen 1100ms linear 1;
}

/* A row that just arrived: warms, then cools. "Fresh" expires by itself. */
.animate-row-fresh {
  animation: gr-row-fresh 6000ms ease-out 1;
}
```

```css
/* --- beside the other @keyframes --- */

@keyframes gr-rule-flash {
  0%, 100% { transform: scaleY(1); }
  50%      { transform: scaleY(3); }
}

@keyframes gr-row-fresh {
  from { background-color: color-mix(in srgb, var(--fest) 12%, transparent); }
  to   { background-color: transparent; }
}
```

```css
/* --- the reduced-motion block is a MANUAL ALLOWLIST (globals.css:377-384).
       A new keyframe utility that is not added here will keep animating. --- */
@media (prefers-reduced-motion: reduce) {
  .animate-marquee,
  .animate-aurora,
  .animate-sheen,
  .animate-pulse-dot,
  .animate-rule-flash,     /* new */
  .animate-sheen-once,     /* new */
  .animate-row-fresh {     /* new */
    animation: none;
  }
}
```

### 5.1 The one design-system change worth making

Today the festival accent travels as an `accentColor` **prop**, applied via inline `style` at every leaf. That's fine for a solid fill and useless for everything in this document — you cannot write `color-mix(in srgb, {accentColor} 14%, transparent)` in a Tailwind class from a JS variable.

Set it once as a CSS custom property on the public layout root:

```tsx
// src/app/(festivalPublic)/[slug]/layout.tsx — on the outermost wrapper
<div style={{ "--fest": accentColor } as React.CSSProperties}>
```

Then every descendant can use it in arbitrary values, in `color-mix`, in keyframes, in `::before`, in dark mode — with no prop threading at all:

```tsx
className="bg-[color-mix(in_srgb,var(--fest)_14%,transparent)] border-[var(--fest)]"
```

Roughly fifteen lines of change. It is the difference between an interaction layer that is cheap to build and one that isn't. **Do this first.**

### 5.2 Motion constants, so the site has one physical signature

Three values already recur across the codebase. Name them and stop re-typing them:

```ts
// src/components/festival/public/motion.ts
export const HOUSE_SPRING = { type: "spring", stiffness: 400, damping: 34 } as const;
export const HOUSE_EASE = [0.22, 1, 0.36, 1] as const;
export const COUNT_SPRING = { stiffness: 90, damping: 20 } as const;
```

`HOUSE_SPRING` is already what `FestivalNavbar.tsx:126-130`, `ResultsList.tsx:299-304`, and `ScheduleByDay.tsx:118` use. Reusing it verbatim is why a brand-new sheet will feel like the same product on first sight.

---

## 6. What this needs from the backend

Ordered by leverage per line. The first four are small and unlock most of the document.

| # | Change | Size | Unlocks |
|---|---|---|---|
| 1 | **Widen the `announce` publish payload** at `announcer.actions.ts:320-325` to carry programme name, winner, team, position | ~4 lines | Turns a refresh-ping into something you can toast, confetti, and animate **without a follow-up fetch**. Highest-leverage change in the entire set. |
| 2 | **Call `invalidatePublicFestivalCaches` in `announceResult`** | ~2 lines | Fixes the 5-minute-stale board on any path that still reads the loader. The helper already exists and is already wired to settings/news/media. |
| 3 | **Select real `startDate` / `endDate` in the public loader** | ~10 lines | See the bug below. |
| 4 | **Join `group.color` into the standings read-model** | small | Team chips in their own colours rather than all in the festival accent. |
| 5 | `GET /standings-at?resultNumber=N`, wrapping the existing `computeStandings(id, 'published', n)` | new route | Rewind rail (§4.2) — only if you build it. |
| 6 | Flip `schedule/stream` auth from `requireAdminSession` to `requirePublicFestivalEnabled` | 1 line | Live stage strip updates rather than a 1s local tick. Optional; the local tick is fine. |

### Bugs found along the way — flagging, not fixing

These are production defects I hit while reading. They're yours to prioritise; I haven't touched any of them.

1. **All public REST endpoints return 404.** Commit `b83f3140` moved `src/app/api/festivals/[slug]/*` → `src/app/api/v1/festivals/festivals/[slug]/*` without updating the callers. Broken right now in production: client-side results paging, search, filter, poster deep-links, and news/media "load more". Callers at `ResultsList.tsx:118` and `:221`, `PublicNewsView.tsx:67`, `PublicMediaView.tsx:68`, `page.tsx:57`. **This is the most serious thing in this document and it has nothing to do with the redesign.**
2. **The countdown counts down to the wrong date.** Both the sticky banner and the hero's date range render the **90-day SaaS billing window** — `festival.createdAt` → `expiresAt` — not the festival dates. Real `startDate`/`endDate` columns exist at `schema.ts:531-532`; the public loader never selects them.
3. **`isLive` is unreachable** (`HeroSection.tsx:36`). Should be `"ONGOING"`.
4. **Every section eyebrow renders in Greenroom red** on a branded festival site. `.text-eyebrow` and `SectionHeader`'s dot use `text-primary`/`bg-primary`, not the festival accent. Same for the navbar's active underline. On a client's own domain, in their own colours, the section headings are our brand.
5. **`announceStandings()` / `publishStandings` never publish to the standings channel.** Only `announceResult` does.
6. **The schedule page discards every day except today**, so the day-tab rail is permanently dead.
7. **`loadTeamDisplayByAssignment` runs an N+1 inside a `for` loop** plus an unfiltered `db.select` over the whole team-lead table — in the home page's TTFB critical path.
8. **`NewsPreview.tsx:57` links every headline to the `/news` index** instead of the article.
9. **The hero's `-mt-16` over-corrects** the ~34px countdown banner by ~30px.
10. **The countdown banner's promised accent strip is invisible** — it sets `border-b` with `style={{borderTopColor}}` and no `border-top-width`.

---

## 7. Build order

### Wave 0 — foundations (half a day, unblocks everything)

1. `--fest` custom property on the public layout root (§5.1).
2. `motion.ts` constants (§5.2).
3. Fix `isLive` → `"ONGOING"`.
4. Delete the double-refresh loop at `HeroSection.tsx:67-83` and the dead `useDeadlineWindow` calls, `WindowStatusBadge`, and the invalid `<dl>`.
5. Backend items 1–3 from §6.

### Wave 1 — the spine (this is the redesign)

| | File | What |
|---|---|---|
| 1 | `HeroSection.tsx` + new `TheLine.tsx` | The Line, four moods, allegiance in `localStorage` |
| 2 | `page.tsx` | Read `?team=`, thread `teamStandings` into the hero (one-line prop add), pass the pre-selected team |
| 3 | `TeamStandingsSection.tsx` | Payload-driven board, `layout` reorder, drop `viewport={{once:true}}`, the Lens, sticky you-row |
| 4 | new `TheDrop.tsx` | `announce` subscription, pulse-rule flash, targeted confetti, toast, mute pill |
| 5 | `HeroSection.tsx` | Press system on the two CTAs |

Ship after Wave 1. It is a complete, coherent product on its own: you pick a team, the page becomes yours, and it moves while you watch.

### Wave 2 — the take layer

6. `WinCard.tsx` — `vaul` sheet, `font-display` name, QR, existing poster pipeline.
7. Share + QR on the committed row (`?team=` deep link).
8. Press-to-Peek on standings rows.
9. Stage Door sheet (`stage.description` — zero backend).
10. Watch This One.

### Wave 3 — only if Wave 1 lands well

11. Rewind the Festival. New endpoint, caching strategy, prefetch policy. The largest and least-vetted item here.

---

## 8. What I deliberately left out

- **Chest-number / participant lookup.** Repeatedly the most-wanted thing, and I'm not specifying it as a design change. The participant table holds `email`, `phone`, `dateOfBirth`, `gender`, `standard`. A public lookup by chest number is a PII decision plus a rate-limiting problem, and it deserves a real product and legal conversation — not a paragraph in an interaction spec.
- **A command palette / "jump to anything."** Scored lowest of everything proposed. It is a power-user affordance for an audience that arrived from a WhatsApp forward on a phone.
- **Ambient background motion** — light rigs, breathing colour fields, houselights. Every version of it was judged as decoration that costs battery on exactly the devices this audience carries. The Pulse Rule does the same job for one keyframe, and it fires only when something actually happened.
- **A ticker / marquee.** The site already has `.animate-marquee` with zero consumers, and a non-interruptible scrolling strip is the opposite of what "more interactive" means.
- **Sound, on by default.** The optional 180ms tick in §4.4 is off until explicitly tapped, and it stays that way.
- **Push notifications.** Named as an upgrade path in §4.5 and left there.

---

## Appendix — how this was produced, and where it's weak

48 concepts were generated across six design lenses, each reviewed by a three-judge panel (design director, feasibility, product). 29 survived. This document takes the top of that ranking and resolves the overlaps by hand.

**Two disclosures:**

1. **One batch lost two of its three judges to an API quota failure.** `standings-reorder`, `rewind-rail`, and `watch-this` each carry a 9.0 from a **single** reviewer. I kept all three because each rests on a claim I verified directly in the source — the stale-cache argument, `resultNumber` being monotonic and public, `programmeId` being present in the announce payload. But they are the least-vetted items here, which is why the largest of them is alone in Wave 3.
2. **`hero-pulse-line` — The Line — is the only 9.0 that survived a full three-judge panel.** It is also the concept that lands on exactly the surface you singled out. That is why the entire document is built around it.

Killed by at least one judge and not carried forward: `jump-palette`, `stage-lock`, `goto-palette`, `race-ticker`, `festival-light-rig`, `houselights`, `chest-watch`, `grapheme-safe-name-reveal`.
