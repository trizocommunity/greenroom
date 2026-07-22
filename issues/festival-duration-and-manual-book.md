# Festival Duration & Manual Book Export

## Status
- **Created**: 2026-07-22
- **Status**: Approved

## Summary

Change festival duration from 30 → 90 days, remove credit validity period, and add Manual Book export for expired festivals.

---

## Problem Statement

1. Festival credit has a 30-day validity period to create a festival after payment — this constraint is unnecessary
2. Festival active period is limited to 30 days — users need more time (90 days)
3. When festivals expire, data is deleted with no way for users to recover their content
4. Users need a comprehensive export of their festival data ("Manual Book")

---

## Solution

### 1. Remove Credit Validity Period

**Files affected:**
- `src/features/payments/repositories/payment.repository.ts` — Remove `validUntil` field, `validityDays` param
- `src/features/billing/actions/billing.actions.ts` — Remove `validUntil` calculation on payment
- `src/app/festival-setup/page.tsx` — Remove `planExpiresAt` calculation from payment validity
- `src/components/festival-setup/FestivalSetupForm.tsx` — Remove date picker `to={planExpiresAt}` constraint

**Changes:**
- Remove `validUntil` from payment creation
- Remove `durationDays` from tier config (was used for credit validity)
- Remove any validation that checks if credit has expired before festival creation

---

### 2. Extend Festival Duration to 90 Days

**Files affected:**
- `src/config/pricing.ts` — Change `durationDays: 30` → `festivalDurationDays: 90` (all tiers)
- `src/features/festivals/actions/festival-crud.actions.ts` — Update `expiresAt` calculation to `createdAt + 90 days`
- `src/features/festivals/actions/festival-crud.actions.ts` — Update validation error message
- `src/components/festival-setup/FestivalSetupForm.tsx` — Date picker `to={createdAt + 90 days}`

**Rules:**
- 90-day countdown starts from `createdAt` (festival creation timestamp)
- User defines `startDate` and `endDate` within this window
- `endDate` must be ≤ `createdAt + 90 days`
- Duration (startDate → endDate) can be any length up to 90 days

---

### 3. 7-Day Grace Period with Dashboard Banner

**Files affected:**
- `src/features/festivals/services/festival-expiration.service.ts` — Update pre-archival logic to `createdAt + 83 days`
- `src/config/pricing.ts` — Add `gracePeriodDays: 7`
- New: `src/components/festival/GracePeriodBanner.tsx`

**Flow:**
1. `createdAt + 83 days` — Festival dashboard shows warning banner: "Your festival will expire in 7 days"
2. `createdAt + 90 days` — Data deletion begins (grace period ends)

---

### 4. Expired Festival Data Deletion

**Files affected:**
- `src/features/festivals/services/festival-expiration.service.ts` — Modify `expireFestival()`

**New behavior:**
- Festival-level data is deleted (students, programmes, categories, groups, stages, schedule, gallery, news)
- Festival **entry is preserved** in profile with `status: EXPIRED`
- Festival metadata preserved (name, slug, tier, createdAt, startDate, endDate)
- Expired festival row shows **"Manual Book" download button**

**Data deleted:**
- `students`, `programmes`, `categories`, `groups`, `stages`
- `scheduleEntries`, `programmeAssignments`
- `festivalGalleryImage`, `festivalNews`
- `festivalMembers`

**Data kept:**
- Festival row (`name`, `slug`, `tier`, `tierLabel`, `ownerId`, `createdAt`, `startDate`, `endDate`, `status: EXPIRED`)

---

### 5. Manual Book Export

**New files:**
- `src/features/festivals/services/manual-book.service.ts` — Export generation service
- `src/app/api/profile/festivals/[festivalId]/manual-book/route.ts` — API route

**Formats:**

| Format | Description |
|--------|-------------|
| **PDF** | Formatted book: cover page, table of contents, sections per programme with results |
| **JSON** | Single file with full structured dump |
| **ZIP** | Multiple JSON files: `students.json`, `programmes.json`, `results.json`, `schedule.json`, `festival.json` |

**Data included (structured data only, no media/images):**

```
festival/
├── festival.json          # name, tier, createdAt, startDate, endDate
├── students.json          # name, email, phone, group, category, chestNumber, gender, age, standard
├── programmes.json        # name, category
├── groups.json            # name, category
├── stages.json            # name, location
├── categories.json        # name, type
├── schedule.json          # date, startTime, endTime, programme, stage, event
└── results.json           # participantName, programme, category, position, grade, score, points
```

**API:**
```
GET /api/profile/festivals/[festivalId]/manual-book?format=pdf|json|zip
```

---

### 6. UI Updates

**Files affected:**
- `src/components/pricing/LifecycleInfo.tsx` — Update text:
  - "Festival remains active for **90 days** after creation"
  - Remove "After expiry, festival becomes read-only" (no longer accurate)
  - Add "Download your festival data anytime after expiry"
- `src/components/festival/FestivalContext.tsx` — Remove `readOnlyExpired` flag (no longer needed)

**Profile Festival List:**
- Expired festivals listed normally among active festivals
- Each row shows: name, dates, status badge "Expired", **"Manual Book" dropdown button** (PDF/JSON/ZIP)
- No separate section — mixed with active festivals

---

## Configuration Changes

**`src/config/pricing.ts`:**
```typescript
// Remove from all tiers:
// - durationDays (no longer needed)
// - postExpiryAccess (no longer relevant)
// - dataRetentionDays (no longer relevant)

// Add to all tiers:
festivalDurationDays: 90,  // same for BASIC, STANDARD, PRO

// New constants:
gracePeriodDays: 7,
```

---

## Migration Notes

1. **Existing festivals** with `expiresAt` set based on old 30-day rule — leave as-is, no retroactive change
2. **In-flight payments** with `validUntil` — these can still be used, no need to invalidate
3. **Profile showing expired festivals** — already preserved, just need to add download button
4. **Existing `expiresAt` field** in schema — keep for backward compatibility, can deprecate later

---

## Acceptance Criteria

- [ ] Credit validity period completely removed — no time limit to create festival after payment
- [ ] Festival duration is 90 days from creation
- [ ] Dashboard shows warning banner 7 days before expiry
- [ ] Expired festivals appear in profile with Manual Book download option
- [ ] Manual Book exports in PDF, JSON, ZIP formats contain all structured festival data
- [ ] UI text updated to reflect 90-day duration
- [ ] All mutations blocked on expired festivals (except download)
