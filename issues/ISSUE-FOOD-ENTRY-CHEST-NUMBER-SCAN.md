# Food Hall Entry — Chest-Number Scan for Daily Meal Sessions

## Status
- **Created**: 2026-08-06
- **Status**: Approved (grill-me session confirmed)
- **Priority**: High
- **Complexity**: Medium
- **Blocks**: any future on-ground check-in work that assumes "scan only happens in programme reporting"
- **Internal dependency**: none (chest-number, QR, drawer, plan-gating infra already in place)

---

## Summary

Add a new dashboard page that lets festival admins / owners scan participants' **chest-number QR codes** to record entry into the **food hall** for a configurable set of daily meal slots (default: Breakfast, Lunch, Dinner — names and times configurable per festival). The page is a flat table of sessions (one row per *day × slot*); clicking a row opens a drawer with a live camera scanner, a live counter, a searchable list of all entries, and a CSV export. Uniqueness is enforced per session so a participant can enter the food hall up to 3 times per day, once per session. Outside any slot window, scans are rejected with a "No active session" message.

The feature reuses the existing chest-number QR pipeline (`getQrCodeContent` → `chestNumber` only), the existing `jsqr`-based `QrScanner` component, the `vaul` Drawer, the per-festival JSONB settings pattern (`chestNumberSettings` analogue), and the `createAuditLog` + `assertFestivalAccess` server-action conventions.

---

## Problem Statement

1. Festivals need a way to track who entered the food hall at each meal. Right now there's no domain object for food, meal, or cafeteria — the only "session" concept is `scheduleEntry.type = "SESSION"` (ceremony/talk/concert), which doesn't fit meal semantics.
2. The existing `programmeReporting` scanner (`scanAndReportParticipantAction`) is gated by programme assignment. It can't be used for food hall because a participant is not "assigned" to a meal — everyone with a chest number is eligible.
3. The `chestNumber` column on `participant` is the de-facto identity used for QR scanning everywhere today (`getQrCodeContent` returns it only). The user wants food-hall scans to plug into the same chest-number pipeline so participants don't need a separate credential.
4. Organisers want per-session uniqueness (the same chest number can't be scanned twice for the same meal) and per-day totals (e.g., "412 of 500 ate lunch") so they know how many extra meals to plan.
5. Volunteers at the food-hall entrance need a mobile-friendly, fast scan → confirm → next loop with strong feedback (sound/colour/toast) so the queue keeps moving.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | What unit does the "already scanned" guard bind to? | **Per session** — a participant can enter 3 times per day (Breakfast, Lunch, Dinner). Unique index `(sessionId, participantId)`. |
| 2 | How are the 3 daily sessions defined? | **Configurable per festival** — slot names (e.g., "Breakfast") AND start/end times are editable per festival. Default 3 slots seeded on first save: Breakfast 07:30–09:00, Lunch 12:00–13:30, Dinner 19:00–21:00. |
| 3 | Who can use the scanning page? | **ADMIN + OWNER** only (existing `event-works` role gate). No new `FOOD_STAFF` role in v1. Page is mobile-responsive (camera-only default, big tap targets). |
| 4 | Who can be scanned? | **Any participant in the festival scope with a non-null `chestNumber`**. Works for both INDIVIDUAL and GROUP programmes because every participant has their own chest number. |
| 5 | What's in the per-session drawer? | Header (`X / Y • Z%`, `Export CSV`), body (live camera scanner + manual-entry input + searchable list of entries), footer (close). **Scanner-only** — no manual add, no manual remove. |
| 6 | How is the table laid out? | **Flat table**, one row per (day × slot), sorted by date then slot order. Columns: Day, Slot, Window, Scanned, Eligible, %, Actions. |
| 7 | Where does the scanner live? | **Inside the row-click drawer**. Active session's row glows; clicking any row swaps to that session's drawer. |
| 8 | What if multiple devices scan simultaneously? | **One active session per festival** at a time, determined by current time vs slot windows. The unique index `(sessionId, participantId)` is the source of truth for double-scan prevention. |
| 9 | Which plans get this feature? | **STANDARD + PRO** only. BASIC tier festival cannot see/access the page or sidebar entry. |
| 10 | Manual corrections (manual add / remove)? | **Scanner-only**. No manual add. No manual remove. Fixes via re-scan only. |
| 11 | What about participants with `chestNumber = null`? | Scan attempt returns `NO_CHEST_NUMBER`-shaped error → "Participant has no chest number assigned. Contact admin." |
| 12 | Audit log? | Yes — every scan that passes the chest-number validation writes an `audit_log` row with `action="FOOD_ENTRY_SCAN"`. Unique-violation 409s also audit-logged with `reason`. |
| 13 | Read-only festivals? | `useFestivalReadOnly()` disables all writes; table still lists historical entries. |
| 14 | Public visibility? | **No public page** in v1. Food data is admin-only. |
| 15 | Per-day slot times? | **No** in v1 — times are per festival (slots apply to every day of the festival). |
| 16 | Festival without `startDate/endDate`? | Page blocks with banner: *"Set festival start/end dates before configuring food entry."* — slot config disabled. |
| 17 | Festival ended? | All rows read-only; drawers show "View" mode (no scanner). |
| 18 | Offline support? | **Out of v1.** Falls back to existing "network error" toast. |
| 19 | Concurrency model | `unique (sessionId, participantId)` enforces no-double-entry. Two devices scanning the same chest number at the same instant: one succeeds, the other gets `ALREADY_SCANNED` toast. The unique index is the lock. |
| 20 | Multiple scans across sessions same day? | Allowed. Each session is independent. |

---

## Out of Scope

- Public-facing food schedule / "did I eat?" check.
- Mobile PWA / offline scan queue.
- Per-day slot times (one set of slots for the whole festival).
- Manual entry / manual removal from the UI.
- Notifications (e.g., low participation, "you haven't eaten").
- A separate `FOOD_STAFF` role.
- Charts / analytics on the food-entry page.
- Export to XLSX (CSV only).
- Drag-to-reorder slots (use ↑/↓ buttons).
- Print / paper sign-in sheet generation.
- Integration with the public participant profile.
- QR code scanning for non-chest-number IDs (e.g., phone number).

---

## Solution

### 1. Schema — Drizzle migration `0046_food_entry.sql`

Three new tables + one optional JSONB column on `festival`. All timestamps are `tzTimestamp()` (mirroring `schema.ts` patterns). All FKs use named constraints for safe DROP/CASCADE. All `createdByName` / `createdByEmail` columns for audit display.

```ts
// Per-festival slot definitions (names + times). Replaces hard-coded 3 slots.
food_hall_slot {
  id text pk
  festival_id text fk -> festival.id (cascade)
  slot_order integer not null               // 1, 2, 3, ...
  name text not null                       // "Breakfast", "Lunch", "Dinner", custom
  window_start_min integer not null        // minutes since 00:00 in festival TZ (e.g., 450 = 07:30)
  window_end_min integer not null          // e.g., 540 = 09:00
  created_at timestamp(3) with time zone default now() not null
  updated_at timestamp(3) with time zone default now() not null
  created_by_name text
  created_by_email text
  unique (festival_id, slot_order)
  check (window_end_min > window_start_min)
  check (window_start_min >= 0 and window_end_min <= 1440)
}

// One row per (date × slot) for the festival's active date range.
food_hall_session {
  id text pk
  festival_id text fk -> festival.id (cascade)
  slot_id text fk -> food_hall_slot.id (cascade)
  session_date date not null               // local festival date
  status session_status default "OPEN"     // OPEN | CLOSED  (mirroring enum from programme reporting)
  created_at timestamp(3) with time zone default now() not null
  updated_at timestamp(3) with time zone default now() not null
  unique (festival_id, slot_id, session_date)
  index (festival_id, session_date)
}

// One row per successful scan within a session.
food_hall_entry {
  id text pk
  session_id text fk -> food_hall_session.id (cascade)
  participant_id text fk -> participant.id (cascade)
  chest_number text not null               // denormalised for audit / quick lookup
  scanned_at timestamp(3) with time zone default now() not null
  scanned_by_user_id text                  // session user id (admin/owner who scanned)
  scanned_by_name text
  scanned_by_email text
  created_at timestamp(3) with time zone default now() not null
  unique (session_id, participant_id)      // the "already scanned" guard
  index (festival_id, scanned_at)          // for cross-session analytics
  index (participant_id)                   // for participant history
}
```

`food_hall_session.festival_id` is **denormalised** (it can be derived via `slot.festival_id`) to keep the entry-creation query single-table and to enable the `(festival_id, scanned_at)` index on entries without joining.

Optional JSONB on `festival` for default settings (parallels `chestNumberSettings`):
```ts
festival.foodHallSettings?: {
  timezone: string                         // e.g., "Asia/Kolkata"
  defaultSlots?: Array<{ name, startMin, endMin }>  // seeded on first save
}
```

Indexes summary:
- `food_hall_slot (festival_id)` — slot config loader
- `food_hall_session (festival_id, session_date)` — table default sort
- `food_hall_session UNIQUE (festival_id, slot_id, session_date)` — block duplicates
- `food_hall_entry UNIQUE (session_id, participant_id)` — the lock
- `food_hall_entry (festival_id, scanned_at)` — analytics / exports
- `food_hall_entry (participant_id)` — participant history

### 2. Feature folder `src/features/food-entry/`

```
features/food-entry/
├── actions/
│   └── food-entry.actions.ts          # server actions
├── repositories/
│   └── food-entry.repository.ts       # DB queries
├── services/
│   ├── food-entry.service.ts          # active-session logic, validations
│   └── food-entry.active.ts           # determineActiveSession(now, slots, festivalId)
├── schemas/
│   └── food-entry.schema.ts           # zod input shapes
└── __tests__/
    ├── food-entry.service.test.ts
    ├── food-entry.actions.test.ts
    └── food-entry.active.test.ts
```

### 3. Server actions (`features/food-entry/actions/food-entry.actions.ts`)

All write actions use `assertFestivalAccess(session, festivalId, { requireWritable: true })`, call `createAuditLog` with `action="FOOD_ENTRY_SCAN"` (or `FOOD_ENTRY_SLOT_CONFIG`), `revalidatePath` the affected routes, and return `ActionResponse<T>` shaping (`{ success: true, data } | { success: false, error, reason? }`).

```ts
// Reads
listFoodSessionsAction(festivalId, { from?, to? })
  → FoodSessionRow[]   // join with slot + entry count + eligible count

getFoodSessionWithEntriesAction(sessionId)
  → { session, slot, stats, entries[] }   // entries: chest, name, category, team, scannedAt, scannedBy

getFoodSlotsAction(festivalId)
  → FoodSlot[]

// Writes
scanFoodEntryAction(input: { festivalId, sessionId, chestNumber })
  → success | { reason: "ALREADY_SCANNED" | "PARTICIPANT_NOT_FOUND" | "NO_CHEST_NUMBER"
                   | "INVALID_CHEST_NUMBER" | "SESSION_CLOSED" | "NO_ACTIVE_SESSION"
                   | "FESTIVAL_READ_ONLY" }

upsertFoodSlotsAction(input: { festivalId, slots: Array<{ id?, slotOrder, name, startMin, endMin }> })
  // 1. validates no overlap among slots
  // 2. upserts slots
  // 3. calls ensureFoodSessionsForRange(festivalId) to materialise sessions for festival.startDate→endDate
  // 4. returns { slots, sessionsCreated }

ensureFoodSessionsForRangeAction(festivalId)
  // called on-demand if rows are missing (date-range change, slot added late)

closeFoodSessionAction(sessionId)
  // admin override to close a session before its window ends
```

**Active-session logic** (`food-entry.service.ts`):
```ts
function determineActiveSession(
  now: Date,
  festivalTimeZone: string,
  slots: FoodSlot[],
  sessionRows: FoodSessionRow[],   // for today
): FoodSessionRow | null {
  const localMinutes = nowInFestivalTZMinutes(now, festivalTimeZone)
  for (const slot of slots) {
    if (localMinutes >= slot.windowStartMin && localMinutes < slot.windowEndMin) {
      return sessionRows.find(s => s.slotId === slot.id) ?? null
    }
  }
  return null
}
```

**Scan validation order** (cheapest first, most specific last):
1. `assertFestivalAccess` — auth + writeability
2. Session exists & belongs to festival
3. Session status is `OPEN`
4. `determineActiveSession` returns the same session (no scanning outside the window even if the row's drawer is open by mistake)
5. Chest number format normalised (trim, upper-case, no whitespace)
6. Participant with that chest number exists in festival
7. `chestNumber` is non-null on the participant row
8. `INSERT INTO food_hall_entry` → unique violation ⇒ `ALREADY_SCANNED`
9. `createAuditLog` with `action="FOOD_ENTRY_SCAN"`, `targetId=entryId`, `metadata={ sessionId, participantId, chestNumber, scannedAt }`

### 4. CSV export

`src/app/api/v1/food-entry/[sessionId]/csv/route.ts` using `createProtectedHandler`:
- Assert festival access, allow `PAST`/`EXPIRED` (read-only).
- Load session + entries.
- Stream `text/csv` with `Content-Disposition: attachment; filename="food-entry-{festivalSlug}-{date}-{slot}.csv"`.
- Columns: `chest_number, participant_name, category_name, team_name, scanned_at, scanned_by_name`.

No job model (CSV is fast and one-off). 2-day retention does not apply.

### 5. UI

#### 5a. Page route

`src/app/dashboard/[slug]/event-works/food-entry/page.tsx`:
- Server component. `getFestivalContext({ requireWritable: false })` (read-only access still allowed for expired festivals' history).
- Role gate: `assertFestivalRoleAccess(session, festivalId, ["ADMIN", "OWNER"])` — others get `notFound()`.
- Feature gate: `getEffectiveFeatureEnabled(tier, "foodEntry")` — BASIC tier gets `notFound()`.
- Loads `festival`, `foodSlots`, `foodSessions` (for `festival.startDate → endDate`), `festival.foodHallSettings`.
- Passes data to `FoodEntryClient`.

#### 5b. Client components

`src/components/festival/event-works/food-entry/FoodEntryClient.tsx`:
- Header: title "Food Hall Entry", subtitle (festival name + current-day indicator + active session badge if any), `[ ⚙ Configure slots ]` button.
- Empty state (no slots configured):
  ```
  ┌────────────────────────────────────────────────────────────────┐
  │ 🍽  No food slots configured.                                  │
  │ Configure when participants can enter the food hall.            │
  │              [   Configure slots   ]                           │
  └────────────────────────────────────────────────────────────────┘
  ```
- Otherwise: `<FoodSessionTable sessions={...} onRowClick={...} />`.
- `<Dialog>` for the slot-config drawer (`<FoodHallSlotsDrawer>`).
- Maintains `activeSessionId` (re-derived every 60s from current time vs slot windows).
- Uses `useFestivalReadOnly()` to disable scanner when festival is read-only.

`src/components/festival/event-works/food-entry/FoodSessionTable.tsx`:
- Flat table. Columns: `Day | Slot | Window | Scanned | Eligible | % | Actions`.
- "Day" uses `format(festival.startDate, "EEE, MMM d")` style.
- "Actions" = `Open` button (or `View` when read-only).
- Active session row: 4px green left border, "Live" badge in the Slot column.
- `useReactTable` for sorting (default: date ASC, slotOrder ASC). Pagination not needed for typical festival lengths (≤ 10 days × 5 slots = 50 rows).

`src/components/festival/event-works/food-entry/FoodSessionDrawer.tsx`:
- `vaul` Drawer. Mobile: bottom sheet, full-screen. Desktop: right panel, 480px wide.
- Header: `Day N — {slotName}` + `Window: {HH:MM}–{HH:MM}` + `[ Export CSV ⬇ ]` + `✕`.
- Body grid (desktop: 2 columns; mobile: stacked):
  - Left col: live scanner (uses `FoodEntryScanner`).
  - Right col: `Scanned: X / Y ({Z}%)` + search input + entries list.
- Footer: `Close` button.
- **Row click from any session opens the drawer for that session** — clicking active session shows the scanner; clicking inactive shows the scanner disabled with a "Not active" banner, but the list is still browsable.
- Active detection refreshed every 60s; if the active session changes while the drawer is open, show a toast `"Active session changed to {slotName} — close this drawer to scan {slotName}"`.

`src/components/festival/event-works/food-entry/FoodEntryScanner.tsx`:
- Thin wrapper around existing `src/components/festival/event-works/programme-reporting/QrScanner.tsx` with `mode="camera"`, `variant="embedded"`, `autoStart={true}`, `hideResults={true}`.
- New `onScan` prop that calls `scanFoodEntryAction` and returns the result; the scanner internally maps errors to its existing `ScanStatus` state machine.
- On success: emit `onSuccess(entry)` so the parent can prepend to the entries list and trigger a green flash.
- On `ALREADY_SCANNED`: emit `onAlreadyScanned(entry)` so the parent can briefly pulse the matching list row in red.
- On any other error: emit `onError(reason)` so the parent shows a toast.

`src/components/festival/event-works/food-entry/FoodHallSlotsDrawer.tsx`:
- `/dialog` (not drawer) since this is a setup form, not a row detail.
- Fields: list of slots (default seeded with 3: Breakfast 07:30–09:00, Lunch 12:00–13:30, Dinner 19:00–21:00). Each slot: name input, start time picker (`HH:MM`), end time picker, ↑/↓ buttons, 🗑 delete button.
- `[ + Add slot ]` appends an empty row.
- Validation (client-side, before submit): no overlap among slots; each slot has start < end; at least 1 slot remains.
- Submit calls `upsertFoodSlotsAction`. On success: `toast.success("Slots saved · {N} sessions created for {X} days")`, close dialog, revalidate.
- Disabled when `useFestivalReadOnly()` is true.

### 6. Sidebar (`src/config/sidebar.config.ts`, Event Works group)

Add:
```ts
{
  title: "Food Entry",
  href: `${basePath}/event-works/food-entry`,
  icon: Utensils,                          // lucide-react
  allowedRoles: ["ADMIN", "OWNER"] as FestivalRole[],
  featureKey: "foodEntry",                 // additive filter in FestivalDashboardSidebar
}
```

### 7. Plan gating

```ts
// src/config/plan-features.config.ts
export const PLAN_FEATURE_TOGGLE_KEYS = [
  ..., "foodEntry",
] as const satisfies readonly FeaturePath[];

// src/config/plan-features.config.ts
PLAN_FEATURE_LABELS.foodEntry = "Food Hall Entry";

// src/config/pricing.ts — TierFeatures
interface TierFeatures {
  ..., foodEntry: boolean
}
TIER_CONFIG.BASIC.foodEntry       = false
TIER_CONFIG.STANDARD.foodEntry    = true
TIER_CONFIG.PRO.foodEntry         = true
```

### 8. Testing

**`features/food-entry/services/food-entry.service.test.ts`** (unit):
- `determineActiveSession` returns null outside any window.
- `determineActiveSession` returns the right slot when local time ∈ [start, end).
- `normalizeChestNumber` trims, uppercases, removes whitespace.
- `validateScansPayload` rejects overlapping slot windows.

**`features/food-entry/__tests__/food-entry.actions.test.ts`** (integration):
- `scanFoodEntryAction` success path inserts row + audits.
- `scanFoodEntryAction` ALREADY_SCANNED on second scan (race condition with two parallel awaits — use `Promise.all`).
- `scanFoodEntryAction` NO_ACTIVE_SESSION outside window.
- `scanFoodEntryAction` PARTICIPANT_NOT_FOUND for unknown chest number.
- `scanFoodEntryAction` NO_CHEST_NUMBER for participant with null chest number.
- `upsertFoodSlotsAction` rejects on overlap.
- `upsertFoodSlotsAction` materialises correct number of session rows for the festival's date range.

**`features/food-entry/__tests__/food-entry.active.test.ts`** (pure unit):
- Cross-midnight boundaries (e.g., 23:30 → 00:30 next-day handling).
- TZ-influenced "now" (test with `Asia/Kolkata` vs `UTC`).
- DST transitions (defer if `Asia/Kolkata` doesn't have DST — note in test).

### 9. Audit log entries

| Action | targetType | metadata |
|---|---|---|
| `FOOD_ENTRY_SCAN` | `food_hall_entry` | `{ sessionId, participantId, chestNumber, scannedAt }` |
| `FOOD_ENTRY_SCAN_DUPLICATE` | `food_hall_entry` | `{ sessionId, participantId, chestNumber, existingEntryId }` (reason="ALREADY_SCANNED") |
| `FOOD_ENTRY_SLOT_CONFIG` | `festival` | `{ added: N, removed: N, updated: N, sessionsCreated: N }` |
| `FOOD_ENTRY_SESSION_CLOSE` | `food_hall_session` | `{ sessionId, closedBy }` |

---

## UI / UX Interaction Roadmap

### Page layout (desktop ≥ 1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Food Hall Entry                  [ ⚙ Configure slots ]                │
│  Festival: LeelaFest 2026 · Day 2 of 3 · Active: Lunch (12:00–13:30)  │
├────────────────────────────────────────────────────────────────────────┤
│  Day       │ Slot       │ Window      │ Scanned  │ Eligible │ %   │ …  │
├────────────┼────────────┼─────────────┼──────────┼──────────┼─────┼────┤
│ Tue, Aug 5 │ Breakfast  │ 07:30–09:00 │ 412/500  │ 500      │ 82% │[↗] │
│ Tue, Aug 5 │ Lunch      │ 12:00–13:30 │ 478/500  │ 500      │ 96% │[↗] │
│ Tue, Aug 5 │ Dinner     │ 19:00–21:00 │ 389/500  │ 500      │ 78% │[↗] │
│ Wed, Aug 6 │ Breakfast  │ 07:30–09:00 │ 401/500  │ 500      │ 80% │[↗] │
│ Wed, Aug 6 │ ▌Lunch     │ 12:00–13:30 │ 223/500  │ 500      │ 45% │[↗] │ ← active
│ Wed, Aug 6 │ Dinner     │ 19:00–21:00 │ 0/500    │ 500      │  0% │[↗] │
│ Thu, Aug 7 │ Breakfast  │ 07:30–09:00 │ 0/500    │ 500      │  0% │[↗] │
│ Thu, Aug 7 │ Lunch      │ 12:00–13:30 │ 0/500    │ 500      │  0% │[↗] │
│ Thu, Aug 7 │ Dinner     │ 19:00–21:00 │ 0/500    │ 500      │  0% │[↗] │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile layout (≤ 768px)

```
┌──────────────────────────────┐
│  Food Hall Entry       [⚙ ]  │
│  LeelaFest 2026 · Day 2 · Wed│
├──────────────────────────────┤
│  [ ◀ ]  Wed, Aug 6  [ ▶ ]    │  ← horizontal day picker
├──────────────────────────────┤
│  Breakfast  07:30-09:00  ✓   │  ← scanned
│  Lunch      12:00-13:30  ◉   │  ← active (tap to scan)
│  Dinner     19:00-21:00      │
├──────────────────────────────┤
│  Today's scanned: 624         │
├──────────────────────────────┤
│  Tap row to scan              │
└──────────────────────────────┘
```

### Per-session drawer (mobile = full-screen, desktop = 480px right panel)

```
┌────────────────────────────────────────────────────────────────┐
│  Day 2 — Lunch                       [ Export CSV ⬇ ]   [ ✕ ]  │
│  Window: 12:00–13:30                                            │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐   Scanned: 223 / 500  (45%)          │
│  │   camera preview     │   ┌────────────────────────────────┐ │
│  │                      │   │ 🔍 Search by name / chest no.  │ │
│  │   ┌────────────┐     │   ├────────────────────────────────┤ │
│  │   │ target box │     │   │ C-042  Sana K.   12:03:14 PM   │ │
│  │   └────────────┘     │   │ C-007  Riya M.   12:03:09 PM   │ │
│  │                      │   │ C-115  Aditi V.  12:03:01 PM   │ │
│  └──────────────────────┘   │ …                                │ │
│   [ ⌨ Manual ] 📷 🔦        └────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                                       [ Close ]                 │
└────────────────────────────────────────────────────────────────┘
```

### State machine

```
FoodEntryClient
├── LOADING ──────────────▶ READY
│                              │
│                              ├── [empty / no slots] ──▶ EMPTY_STATE
│                              │                              │
│                              │                              ▼
│                              │                              [Configure slots] ──▶ FoodHallSlotsDrawer
│                              │                                                                  │
│                              │                                                                  ▼
│                              │                                                       [Save] ──▶ READY (table populated)
│                              │
│                              └── [populated] ──▶ TABLE (flat)
│                                                       │
│                                                       ├── [row click] ──▶ FoodSessionDrawer
│                                                       │                       │
│                                                       │                       ├── camera auto-start
│                                                       │                       ├── scan ──▶ mutate entry
│                                                       │                       └── [Close] ──▶ TABLE
```

### Active-session auto-detection (every 60s)

```
on mount + every 60s
  →
slots.forEach(slot => {
  const nowMinutes = nowInFestivalTZMinutes(now, festival.foodHallSettings?.timezone)
  if (nowMinutes >= slot.windowStartMin && nowMinutes < slot.windowEndMin)
    setActiveSlotId(slot.id)
})
  →
only active session's row accepts scans
  →
active session's drawer shows live pulse ring around scanner frame
inactive session's drawers show "Not active" banner + read-only list
```

### First-time setup flow

```
[Visit /food-entry]      ─→  slot config not found
                              │
                              ▼
                       ┌────────────────────────────────────────┐
                       │ 🍽  No food slots configured.           │
                       │ Add meal slots to start scanning.       │
                       │      [   Configure slots   ]           │
                       └────────────────────────────────────────┘
                              │
                              ▼
                       [Click Configure slots] ──▶ FoodHallSlotsDrawer (Dialog)
                              │
                              ▼   default seeded: Breakfast 07:30–09:00, Lunch 12:00–13:30, Dinner 19:00–21:00
                              │
                              ▼
                       [Edit times / names / add or remove slots]
                              │
                              ▼
                       [Save] ──▶ upsertFoodSlotsAction
                              │   - validates non-overlap
                              │   - upserts slots
                              │   - ensureFoodSessionsForRange(festivalId)
                              │   - audit FOOD_ENTRY_SLOT_CONFIG
                              │
                              ▼
                       toast.success("3 slots · 9 sessions created")
                              │
                              ▼
                       Table populated, ready to scan
```

### Slot config dialog

```
┌────────────────────────────────────────────────────────────────┐
│  Configure food slots                                  [ ✕ ]   │
├────────────────────────────────────────────────────────────────┤
│  Slot            Start        End          Order                │
│  [Breakfast]     [07:30] ▶    [09:00] ▶    [ 1 ] [↑] [↓] [🗑]  │
│  [Lunch]         [12:00] ▶    [13:30] ▶    [ 2 ] [↑] [↓] [🗑]  │
│  [Dinner]       [19:00] ▶    [21:00] ▶    [ 3 ] [↑] [↓] [🗑]  │
│                                                                │
│  [ + Add slot ]                                                │
│                                                                │
│  Materialising sessions for festival days (3 days × 3 slots = 9)│
│                                                                │
│  [ Cancel ]                  [  Save & create sessions  ]     │
└────────────────────────────────────────────────────────────────┘
```

### Error matrix

| Trigger | Response | UI feedback |
|---|---|---|
| Valid QR, unknown chest number | `PARTICIPANT_NOT_FOUND` | Red toast: `"No participant with chest number X-999 in this festival"` |
| Valid QR, participant with `chestNumber = null` | `NO_CHEST_NUMBER` | Red toast: `"Participant has no chest number assigned. Contact admin."` |
| **Already scanned in this session** | `ALREADY_SCANNED` | Orange toast: `"X-042 already entered for Lunch"` + matching list row pulses red 250ms |
| Session is `CLOSED` (admin override) | `SESSION_CLOSED` | Red toast: `"Lunch session is closed"` |
| Scanned outside window | `NO_ACTIVE_SESSION` | Red toast: `"No food session is active right now. Next: Dinner at 19:00"` |
| Wrong-format QR (URL / random text) | `INVALID_CHEST_NUMBER` | Red toast: `"Not a valid chest number"` + camera continues |
| Camera permission denied | handled by QrScanner | Camera view replaced with manual entry panel + guidance |
| Insecure context (HTTP) | handled by QrScanner | Same as above |
| Network error / server action throws | `UNKNOWN_ERROR` | Orange toast: `"Couldn't record entry — try again"` + log the failure |
| Festival is read-only | `FESTIVAL_READ_ONLY` | Banner at top of page; scan button disabled; row click opens View-only drawer |

### Success path

```
[Volunteer opens scanner drawer]
        │
        ▼
[Camera auto-starts]   (paused if tab is hidden, resumed on focus)
        │
        ▼ volunteer points camera at chest-number QR
        │
        ▼ jsQR decodes payload (chest number)
        │
        ▼ mutate: scanFoodEntryAction(festivalId, sessionId, chestNumber)
        │
        ▼ optimistic: row appears at top of list, slide-in animation, green flash 250ms
        │
        ▼ toast.success("C-042  ·  Sana K.  entered")
        │
        ▼ scanner resumes automatically
```

### Concurrent-scanning behaviour

```
Time T0: Volunteer A scans C-042  → INSERT succeeds
Time T0: Volunteer B scans C-042  → INSERT fails (unique violation)
                                  → ALREADY_SCANNED
                                  → orange toast on device B
                                  → list row on device B pulses red
Time T1: Volunteer A scans C-043  → INSERT succeeds
                                  → both devices see the new row (refetch / refetchInterval)
```

Both devices have the same `useReactQuery` query key (`["food-entries", sessionId]`) polled at `refetchInterval: 5_000` so updates propagate without a manual refresh.

### Drawer micro-interactions

| Interaction | Behaviour |
|---|---|
| Row click | Opens drawer (vaul animation: bottom-sheet mobile, right-panel desktop) |
| Camera auto-start | On drawer open; paused if tab hidden; resumed on focus |
| Successful scan | Add row to top of list, slide-in from top, green flash 250ms |
| Search | Debounced 200ms, filters list by chest number OR name (case-insensitive) |
| Sort | Default by `scannedAt DESC`; toggleable to ASC |
| CSV Export | `/api/v1/food-entry/[sessionId]/csv` → toast.success + auto-download |
| ✕ Close | Camera stops, list state preserved if drawer reopens within the session |
| Active session changes while open | Toast `"Active session changed to {slotName} — close this drawer to scan {slotName}"` (does NOT auto-close; volunteer decides) |

### Accessibility & edge cases

- Scanner viewport: `aria-live="polite"` announces each successful scan to screen readers.
- Toast: `sonner` differentiates success/error tones; `aria-live` enabled.
- Keyboard: `[M]` toggles manual input, `[Esc]` closes drawer, `[⏎]` submits manual entry.
- Time zones: all windows in festival TZ; footer of drawer shows festival TZ + browser TZ for disambiguation.
- No festival dates (startDate null) → page blocks with banner, slot config disabled.
- Festival ended → all rows read-only; drawers show "View" mode (no scanner).
- Slot config attempted with overlap → form validation: `"Lunch window overlaps Dinner"` (client-side before save).
- Slot config with 0 slots → Save button disabled.
- Concurrent slot edit by two admins → second save wins; toast.info("Slots updated by another admin — refresh to see latest").

### Out-of-scope UI (v1)

- No public food schedule view.
- No participant-side "did I eat?" check.
- No notification system (low participation, missed meals).
- No drag-to-reorder slots.
- No charts / analytics on the food-entry page.
- No dark-mode-specific adjustments (inherits global theme).

---

## Files to Create / Modify

### Create
- `drizzle/0046_food_entry.sql`
- `src/features/food-entry/actions/food-entry.actions.ts`
- `src/features/food-entry/repositories/food-entry.repository.ts`
- `src/features/food-entry/services/food-entry.service.ts`
- `src/features/food-entry/services/food-entry.active.ts`
- `src/features/food-entry/schemas/food-entry.schema.ts`
- `src/features/food-entry/__tests__/food-entry.service.test.ts`
- `src/features/food-entry/__tests__/food-entry.actions.test.ts`
- `src/features/food-entry/__tests__/food-entry.active.test.ts`
- `src/app/dashboard/[slug]/event-works/food-entry/page.tsx`
- `src/components/festival/event-works/food-entry/FoodEntryClient.tsx`
- `src/components/festival/event-works/food-entry/FoodSessionTable.tsx`
- `src/components/festival/event-works/food-entry/FoodSessionDrawer.tsx`
- `src/components/festival/event-works/food-entry/FoodEntryScanner.tsx`
- `src/components/festival/event-works/food-entry/FoodHallSlotsDrawer.tsx`
- `src/components/festival/event-works/food-entry/FoodEntriesList.tsx`
- `src/app/api/v1/food-entry/[sessionId]/csv/route.ts`

### Modify
- `src/core/database/schema.ts` — add three `pgTable` exports + enum
- `src/core/database/relations.ts` — wire relations (slot/session/entry ↔ festival/participant/slot)
- `src/config/pricing.ts` — add `foodEntry` to `TierFeatures`; STANDARD + PRO = true, BASIC = false
- `src/config/plan-features.config.ts` — add `foodEntry` to `PLAN_FEATURE_TOGGLE_KEYS` + `PLAN_FEATURE_LABELS`
- `src/config/sidebar.config.ts` — add `Food Entry` entry under `event-works`
- `src/app/dashboard/[slug]/layout.tsx` — no change required (existing gating works)
- `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` — no change required (existing `featureKey` filter works)

### Reuse (no change)
- `src/components/festival/event-works/programme-reporting/QrScanner.tsx` — wrapped by `FoodEntryScanner`
- `src/components/ui/drawer.tsx` — vaul wrapper
- `src/components/ui/table.tsx` — table primitives
- `src/components/ui/dialog.tsx` — slot config dialog
- `src/features/participants/services/participant-profile-url.ts` — `getQrCodeContent` already returns chest number only
- `src/lib/toast.ts` — `toast.success` / `toast.error`
- `src/api/lib/create-handler.ts` — `createProtectedHandler` for CSV route
- `src/core/auth` — `assertFestivalAccess`, `getSession`
- `src/core/audit` — `createAuditLog`

---

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| 1 | Schema + migration | `0046_food_entry.sql` (Track A + B); relations; enums | `pnpm db:reset`; `\d food_hall_entry` shows unique index |
| 2 | Repositories + service skeleton | `food-entry.repository.ts` CRUD; `food-entry.service.ts` with `determineActiveSession` | Unit tests for `determineActiveSession` |
| 3 | Slot config actions | `upsertFoodSlotsAction`, `ensureFoodSessionsForRangeAction`, `getFoodSlotsAction` | Unit tests for overlap validation + session materialisation |
| 4 | Scan action | `scanFoodEntryAction` with full reason matrix; audit logging | Integration tests for ALREADY_SCANNED race + each reason |
| 5 | Plan gating + sidebar | `foodEntry` in `pricing.ts` + `plan-features.config.ts`; sidebar entry | BASIC tier festival gets `notFound()`; STANDARD + PRO see sidebar |
| 6 | Page + table | `page.tsx`, `FoodEntryClient`, `FoodSessionTable` | Empty state visible; populated table renders |
| 7 | Slot config drawer | `FoodHallSlotsDrawer` (Dialog) | Save creates slot rows + sessions; toast |
| 8 | Session drawer + scanner | `FoodSessionDrawer`, `FoodEntryScanner` (wraps `QrScanner`) | Camera auto-starts; scan inserts; toast; list updates |
| 9 | CSV export | `/api/v1/food-entry/[sessionId]/csv/route.ts`; download button in drawer | curl downloads CSV; columns correct |
| 10 | Mobile polish | day picker, full-screen drawer, big tap targets | iPhone Safari test |
| 11 | Accessibility + edge cases | aria-live, keyboard shortcuts, TZ display, read-only mode | axe-core; manual tests |
| 12 | Final QA | active-session transitions, concurrent scans, festival-ended mode | Manual + e2e |

---

## Acceptance Criteria

- [ ] Migration `0046_food_entry.sql` applied; three tables + unique index exist; enums in schema.
- [ ] `/dashboard/[slug]/event-works/food-entry` renders for ADMIN/OWNER of STANDARD+PRO festivals; `notFound()` otherwise.
- [ ] Sidebar entry **Food Entry** appears under **Event Works** for ADMIN/OWNER when `foodEntry` flag is enabled.
- [ ] First-time visit shows empty state with **Configure slots** CTA.
- [ ] Configure slots dialog seeds 3 default slots (Breakfast 07:30–09:00, Lunch 12:00–13:30, Dinner 19:00–21:00), editable; rejecting overlap prevents save.
- [ ] Saving slots materialises one `food_hall_session` row per (day × slot) for the festival's `startDate → endDate` range.
- [ ] Flat table renders one row per session, sorted by date then slot order; active session row has a green border + "Live" badge.
- [ ] Active session re-derives every 60s; UI updates without manual refresh.
- [ ] Clicking a row opens a vaul drawer with: header, scanner (auto-camera), live counter, searchable entries list, CSV export button.
- [ ] Scanning a valid chest number within the active window inserts a `food_hall_entry` row, optimistically prepends to the list, and fires a green toast.
- [ ] Scanning a valid chest number **outside** the active window returns `NO_ACTIVE_SESSION` and shows a red toast; no entry is created.
- [ ] Scanning the same chest number twice in the same session returns `ALREADY_SCANNED` and the existing row pulses red; no second entry is created.
- [ ] Scanning an unknown chest number returns `PARTICIPANT_NOT_FOUND`; no entry created.
- [ ] Scanning a participant with `chestNumber = null` returns `NO_CHEST_NUMBER`; no entry created.
- [ ] Manual entry input (within camera-denied fallback) submits a chest number through the same scan action.
- [ ] CSV export button downloads `food-entry-{festivalSlug}-{date}-{slot}.csv` with columns: chest_number, participant_name, category_name, team_name, scanned_at, scanned_by_name.
- [ ] Slot config: edit name, edit times, add, remove, reorder; all changes audit-logged in `audit_log` with action `FOOD_ENTRY_SLOT_CONFIG`.
- [ ] Every successful scan writes an `audit_log` row with `action="FOOD_ENTRY_SCAN"`, `targetType="food_hall_entry"`, and `metadata` containing `{ sessionId, participantId, chestNumber, scannedAt }`.
- [ ] Concurrent scans from two devices: one succeeds, the other returns `ALREADY_SCANNED`; unique index prevents duplicate rows.
- [ ] Festival ended (read-only mode): table renders, drawers open in view-only mode, scanner disabled with explanatory banner.
- [ ] Festival with `startDate` null: page blocks with banner *"Set festival start/end dates before configuring food entry."*; slot config disabled.
- [ ] Mobile layout (≤ 768px): horizontal day picker, full-screen drawer, big tap targets, camera-only default.
- [ ] All tests pass: `pnpm test` covers `food-entry.service`, `food-entry.actions`, `food-entry.active`.
- [ ] No new dependencies added to `package.json` (reuses `jsqr`, `vaul`, `sonner`, `qrcode`).
- [ ] `pnpm lint` and `pnpm check` pass.

---

## References

- Chest-number pipeline: `src/features/participants/services/participant-profile-url.ts:53` (`getQrCodeContent`)
- Chest-number actions: `src/features/participants/actions/chest-number.actions.ts:71` (`generateChestNumbers`)
- QR scanner component: `src/components/festival/event-works/programme-reporting/QrScanner.tsx` (1008 lines)
- QR generation: `src/components/common/QrCodeDisplay.tsx`, `src/components/common/QrCodeWithActions.tsx`
- Badge ↔ QR: `src/components/participant/ParticipantBadgeOrQr.tsx`
- Drawer wrapper: `src/components/ui/drawer.tsx` (vaul)
- Table wrapper: `src/components/ui/table.tsx`
- Programme reporting (closest analogue): `src/features/programmes/actions/programme-reporting.actions.ts:321` (`scanAndReportParticipantAction`)
- Programme reporting scanner integration: `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx:1641,1671`
- Schema conventions: `src/core/database/schema.ts:758-823` (`participant`), `:1293-1429` (`programmeReportingSession` / `programmeReportedParticipant`)
- Audit log: `src/core/audit`
- Access guards: `assertFestivalAccess(session, festivalId, { requireWritable: true })`
- Plan gating: `src/config/pricing.ts`, `src/config/plan-features.config.ts:5-51`
- Sidebar config: `src/config/sidebar.config.ts`
- Festival dates: `src/core/database/schema.ts:474-475` (`startDate`, `endDate`)
- Closest blueprint PRD: `issues/ISSUE-GENERAL-ENTRIES-C-MARK-AWARDS.md`
- Exports PRD (for CSV route patterns): `issues/ISSUE-15-festival-lifecycle-and-exports-PARTIAL.md` §2
- TZ datetime helpers: `src/core/datetime/`
- PRD: `docs/PRDs/GREENROOM_PRD.md`
