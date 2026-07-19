# issue-04: Profile Settings — User Details & Account Management

**Status:** COMPLETED

## TL;DR

Consolidate all user profile editing into a new **Settings** tab in the Profile page Account sidebar. Replace the current pencil-icon edit shortcut with a proper settings page showing all user/institutional details and an "Update Profile" dialog.

---

## Problem

The current profile UX has scattered editability:

1. **Pencil icon on avatar** (`ProfileSidebarContent`) → opens `EditProfileDialog` with only `fullName` + `displayName`
2. **No central place** to view/edit complete user details (email read-only, institutional data not shown)
3. **Institutional users** cannot see or update their institution details after onboarding
4. **Personal users** cannot update their `userRole` after onboarding

---

## Design

### New "Settings" Tab

**Route:** `/profile?tab=settings` (same page, new tab)

**Sidebar Navigation Item (Account section):**
- Overview, Billing, My Festivals, **Settings** (NEW)

**Settings Tab Layout:** Read-only display of all user/institution fields with "Update Profile" button opening a dialog to edit them.

---

## Fields by Account Type

| Field | PERSONAL | INSTITUTIONAL | Editable |
|-------|----------|---------------|----------|
| fullName | ✓ | ✓ | ✓ |
| displayName | ✓ | ✓ | ✓ |
| email | ✓ | ✓ | ✗ (read-only) |
| accountType | ✓ | ✓ | ✗ (read-only) |
| userRole | ✓ | ✓ | ⚠️ (pending DB migration) |
| institutionName | — | ✓ | ✓ |
| institutionType | — | ✓ | ✓ |
| affiliation | — | ✓ | ✓ |
| city | — | ✓ | ✓ |
| sizeRange | — | ✓ | ✓ |

---

## Sub-task Summary

| # | Description | Files | Status |
|---|-------------|-------|--------|
| **04-A** | Add `Settings` nav item to `ProfileSidebarContent` items array | `src/components/profile/ProfileSidebarContent.tsx` | ✅ |
| **04-B** | Create `SettingsTab` component with read-only detail display | `src/components/profile/tabs/SettingsTab.tsx` | ✅ |
| **04-C** | Expand `UpdateProfileDialog` to handle all editable fields | `src/components/profile/UpdateProfileDialog.tsx` | ✅ |
| **04-D** | Remove pencil icon trigger from `ProfileSidebarContent` | `src/components/profile/ProfileSidebarContent.tsx` | ✅ |
| **04-E** | Add `useUpdateInstitution` hook for institutional field updates | `src/api/client/profile.ts` | ✅ |
| **04-F** | Extend `updateProfileInput` schema for `userRole` | `src/api/contracts/profile.ts` | ✅ |
| **04-G** | Add institution update API route | `src/app/api/v1/profile/institution/route.ts` | ✅ |

---

## Implementation Notes

### Completed
- New Settings tab in Account sidebar (ProfileSidebarContent)
- SettingsTab component showing personal + institutional info (read-only display)
- UpdateProfileDialog for fullName, displayName, userRole (userRole selection UI works but not persisted)
- UpdateInstitutionDialog for institutional fields (institutionName, type, affiliation, city, sizeRange)
- PUT /api/v1/profile/institution for institutional updates
- Fixed GET /api/v1/profile to return user with institution relation

### Pending: userRole Storage
The `userRole` field is collected during onboarding but **never persisted** anywhere. The UpdateProfileDialog includes a userRole selector, but the value is currently not stored due to missing DB column.

**Required Migration:** Add `userRole` column to `user` table:
```sql
ALTER TABLE "user" ADD COLUMN "userRole" text;
```

Then update onboarding routes to store userRole on the user record.

---

## Dependencies

- None (standalone feature)

---

## Out of Scope

- Changing password
- Deleting account
- Changing email
- Changing account type
