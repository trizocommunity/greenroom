# issue-03: Profile Page UX — SUPER_ADMIN Redirect, Owner View, Mobile Responsiveness

**Status:** IN_PROGRESS

## TL;DR

Fix three profile page gaps: (1) SUPER_ADMIN users redirected to `/profile` after login instead of `/super-admin`, (2) OWNER users see redundant "Joined Festivals" section in OverviewTab, (3) critical mobile responsiveness gaps across profile components.

---

## Problem 1: SUPER_ADMIN Redirects to `/profile` After Login

**File:** `src/features/auth/hooks/use-auth.ts`

**Current behavior:**
```typescript
onSuccess: (data) => {
  // data.body.role === "SUPER_ADMIN" available but NOT USED
  router.push("/profile"); // Always redirects to profile
}
```

**Expected behavior:**
- SUPER_ADMIN → redirect to `/super-admin`
- Regular USER with pending onboarding → redirect to `/onboarding`
- Regular USER completed → redirect to `/profile`

---

## Problem 2: OWNER Users See Redundant "Joined Festivals" in OverviewTab

**File:** `src/components/profile/tabs/OverviewTab.tsx`

**Current behavior:**
- All users see "Joined Festivals" section regardless of whether they own a festival
- OWNER users with `ownedContent` see both "Owned Festival" card AND "Joined Festivals" section
- This is redundant — owners don't need to see joined festivals on the overview

**Expected behavior:**
- OWNER users (those with active owned festival) → only show Owned Festival + Plans
- Non-OWNER users with joined festivals → show Joined Festivals section
- Need to determine ownership from `useMyFestivals()` data

---

## Problem 3: Mobile Responsiveness Gaps

### 3-A: BillingTab — Table Not Mobile-Friendly

**File:** `src/components/profile/tabs/BillingTab.tsx`

**Current behavior:**
- Uses native `<table>` layout with no mobile adaptation
- Payment rows become squished on small screens

**Fix:** Transform to card-based layout on mobile (`<768px`)

### 3-B: Profile View — Sidebar Stacking Poor UX

**File:** `src/components/profile/profile-view.tsx`

**Current behavior:**
- Sidebar stacks vertically above content on mobile
- No mobile-optimized navigation

**Fix:** On mobile, show horizontal tab bar that sticks to top, or use a collapsible drawer

### 3-C: EditProfileDialog — Fixed Width Not Full-Screen

**File:** `src/components/profile/EditProfileDialog.tsx`

**Current behavior:**
- Uses fixed `max-w-md` which is too narrow on mobile

**Fix:** Use `sm:max-w-md` so mobile gets full-screen dialog

---

## Sub-task Summary

| # | Description | Files |
|---|-------------|-------|
| **03-A** | useVerifyMagicLink: redirect SUPER_ADMIN to /super-admin | `src/features/auth/hooks/use-auth.ts` |
| **03-B** | OverviewTab: hide Joined Festivals for OWNER users | `src/components/profile/tabs/OverviewTab.tsx` |
| **03-C** | BillingTab: transform table to cards on mobile | `src/components/profile/tabs/BillingTab.tsx` |
| **03-D** | profile-view: improve mobile sidebar/tab navigation | `src/components/profile/profile-view.tsx` |
| **03-E** | EditProfileDialog: full-screen on mobile | `src/components/profile/EditProfileDialog.tsx` |

---

## Dependencies

- None
