# issue-05: Festival Settings Page — Restructure for Festival-Only Settings

**Status:** COMPLETED

## TL;DR

Restructure the `/dashboard/[slug]/settings` page to be festival-only (remove organization fields). Replace inline forms with dialogs for editing and add read-only cards for Status, Usage & Limits, and Plan info. Rename "Festival" tab to "Configuration".

---

## Problem

Current settings page has organizational fields that don't belong in a festival-focused settings page:

1. **Organization fields in General tab** — `orgName`, `orgDescription`, `orgWebsite`, `orgLocation` are not festival-specific
2. **Inline editing forms** — All fields are editable inline with no dialog/modal pattern
3. **Missing read-only sections** — Festival Status, Usage & Limits, and Plan info are not displayed
4. **Naming** — "Festival" tab should be called "Configuration" to better reflect its purpose

---

## Design

### New Tab Structure

| Tab | Contents |
|-----|----------|
| **General** | Visual Identity (edit), Festival Status (read-only), Usage & Limits (read-only), Plan & Payment (read-only) |
| **Configuration** | Festival Details (edit), Deadlines (edit), Team & Results (edit), Advanced (edit) |

Both tabs visible to ALL tiers (BASIC, STANDARD, PRO). Remove tier-based tab hiding.

### General Tab Sections

#### 1. Visual Identity Card (Editable)
- Logo preview + color preview
- Edit button → `VisualIdentityDialog`
- Fields: `logo` (Cloudinary upload)
- Feature gate: `logoUpload`

#### 2. Festival Status Card (Read-only)
- Status badge with icon
- Countdown text (e.g., "5d left", "Started today")
- Start date, End date
- No actions

#### 3. Usage & Limits Card (Read-only)
- Progress bars for:
  - Students: `studentsCount / tierLimit`
  - Programmes: `programmesCount / tierLimit`
  - Stages: `stagesCount / tierLimit`
  - Storage: `storageUsedMb / tierLimitMB`

#### 4. Plan & Payment Card (Read-only)
- Current tier name and label
- No upgrade/manage links

### Configuration Tab Sections

#### 1. Festival Details (Editable)
- Fields: `name`, `description`, `startDate`, `endDate`, `location`
- Dialog: `FestivalDetailsDialog`

#### 2. Deadlines (Editable)
- Fields: `programmeAssignmentDeadline`, `studentCreationDeadline`
- Dialog: `DeadlinesDialog`
- Feature gate: `programmeAssignmentDeadline`

#### 3. Team & Results (Editable)
- Fields: `teamLeaderLimit`, `announcerResultsPerStandings`
- Dialog: `TeamResultsDialog`

#### 4. Advanced (Editable)
- Fields: `scoringSystem`, `publicDisplayMode`, `chestNumberSettings`
- Dialog: `AdvancedSettingsDialog`
- Feature gate: `advancedSettings`

---

## Component Architecture

```
@/components/festival/settings/
├── cards/
│   ├── FestivalStatusCard.tsx      # Read-only: status badge, countdown, dates
│   ├── UsageLimitsCard.tsx         # Read-only: progress bars for limits
│   └── PlanPaymentCard.tsx         # Read-only: tier info
└── dialogs/
    ├── VisualIdentityDialog.tsx     # Edit: logo (Cloudinary upload)
    ├── FestivalDetailsDialog.tsx    # Edit: name, description, dates, location
    ├── DeadlinesDialog.tsx          # Edit: programme/student deadlines
    ├── TeamResultsDialog.tsx        # Edit: teamLeaderLimit, announcerResults
    └── AdvancedSettingsDialog.tsx   # Edit: scoring, display mode, etc.
```

---

## Sub-task Summary

| # | Description | Files | Status |
|---|-------------|-------|--------|
| **05-A** | Create `FestivalStatusCard` component | `@/components/festival/settings/cards/FestivalStatusCard.tsx` | ✅ |
| **05-B** | Create `UsageLimitsCard` component | `@/components/festival/settings/cards/UsageLimitsCard.tsx` | ✅ |
| **05-C** | Create `PlanPaymentCard` component | `@/components/festival/settings/cards/PlanPaymentCard.tsx` | ✅ |
| **05-D** | Create `VisualIdentityDialog` | `@/components/festival/settings/dialogs/VisualIdentityDialog.tsx` | ✅ |
| **05-E** | Create `FestivalDetailsDialog` | `@/components/festival/settings/dialogs/FestivalDetailsDialog.tsx` | ✅ |
| **05-F** | Create `DeadlinesDialog` | `@/components/festival/settings/dialogs/DeadlinesDialog.tsx` | ✅ |
| **05-G** | Create `TeamResultsDialog` | `@/components/festival/settings/dialogs/TeamResultsDialog.tsx` | ✅ |
| **05-H** | Create `AdvancedSettingsDialog` | `@/components/festival/settings/dialogs/AdvancedSettingsDialog.tsx` | ✅ |
| **05-I** | Restructure `SettingsForm` — remove org fields, add cards/dialogs | `src/app/dashboard/[slug]/settings/_components/SettingsForm.tsx` | ✅ |
| **05-J** | Remove tier-based tab hiding (always show both tabs) | `SettingsForm.tsx` | ✅ |

---

## Fields Mapping

### Remove (Organization Fields)
| Field | Current Location | Action |
|-------|-----------------|--------|
| `orgName` | SettingsForm → Organization & Online card | REMOVE |
| `orgDescription` | SettingsForm → Organization & Online card | REMOVE |
| `orgWebsite` | SettingsForm → Organization & Online card | REMOVE |
| `orgLocation` | SettingsForm → Organization & Online card | REMOVE |

### Editable via Dialog
| Field | Dialog | Feature Gate |
|-------|--------|--------------|
| `logo` | VisualIdentityDialog | `logoUpload` |
| `name` | FestivalDetailsDialog | — |
| `description` | FestivalDetailsDialog | — |
| `startDate` | FestivalDetailsDialog | — |
| `endDate` | FestivalDetailsDialog | — |
| `location` | FestivalDetailsDialog | — |
| `programmeAssignmentDeadline` | DeadlinesDialog | `programmeAssignmentDeadline` |
| `studentCreationDeadline` | DeadlinesDialog | — |
| `teamLeaderLimit` | TeamResultsDialog | — |
| `announcerResultsPerStandings` | TeamResultsDialog | — |
| `scoringSystem` | AdvancedSettingsDialog | `advancedSettings` |
| `publicDisplayMode` | AdvancedSettingsDialog | `advancedSettings` |
| `chestNumberSettings` | AdvancedSettingsDialog | `advancedSettings` |

### Read-Only
| Field | Card |
|-------|------|
| `status` | FestivalStatusCard |
| `expiresAt` | FestivalStatusCard |
| `studentsCount` | UsageLimitsCard |
| `programmesCount` | UsageLimitsCard |
| `stagesCount` | UsageLimitsCard |
| `storageUsedMb` | UsageLimitsCard |
| `tier` | PlanPaymentCard |
| `tierLabel` | PlanPaymentCard |

---

## Dependencies

- `src/features/plan-features/services/features.ts` — Feature gate checks
- `src/config/pricing.ts` — Tier limits for UsageLimitsCard
- `src/features/festivals/services/festival-status.service.ts` — Status labels and countdown
- Existing actions: `updateFestivalAction`, `updateFestivalBrandingAction`, `updateFestivalSettingsAction`

---

## Out of Scope

- Changing festival owner
- Deleting festival
- Moving organization fields elsewhere
- Payment/billing management (view only as per design)

---

## Reference

- Existing `FestivalStatusBadge` at `src/components/festival/FestivalStatusBadge.tsx`
- Existing `LimitationCard` at `src/components/festival/dashboard/LimitationCard.tsx`
- Existing dialog UI at `src/components/ui/dialog.tsx`
- Current SettingsForm at `src/app/dashboard/[slug]/settings/_components/SettingsForm.tsx`
