# issue-02: Auth UX — Magic Link Form Feedback & Dev Mode Logging

**Status:** OPEN

## TL;DR

Fix three UX gaps in the magic link login flow: (1) no in-page confirmation after sending link, (2) dev mode never prints magic link URL for new users, (3) user never sees which email the link was sent to.

---

## Problem 1: No In-Page Success Feedback After Submit

**File:** `src/components/auth/MagicLinkRequestForm.tsx`

**Current behavior:**
- User enters email, clicks "Send Magic Link"
- Button shows spinner during request ✅
- On success: only a `toast.success("Check your email for a magic link")` — easily missed
- Form stays rendered as-is with input still visible
- User could accidentally double-submit

**Expected behavior:**
After success, the form should be replaced with a confirmation panel showing the submitted email.

---

## Problem 2: Dev Mode Magic Link URL Never Prints (New Users)

**File:** `src/app/api/v1/auth/route.ts`

**Root Cause:**

```typescript
const token = await createMagicLinkToken(email, MAGIC_LINK_EXPIRY_MS);
const user = await db.query.user.findFirst({ where: ... });

if (user) {
  await sendMagicLinkEmail(email, token); // ← only sent if user EXISTS
}
```

For new users, `sendMagicLinkEmail` is never called → dev-mode console log in `email.ts` never fires → URL never logged.

**Fix:** Always log URL in dev mode, before the send attempt, regardless of user existence.

---

## Sub-task Summary

| # | Description | Files |
|---|-------------|-------|
| **02-A** | MagicLinkRequestForm: replace form with confirmation card on success | `src/components/auth/MagicLinkRequestForm.tsx` |
| **02-B** | Auth route: always log magic link URL in dev mode | `src/app/api/v1/auth/route.ts` |

---

## Dependencies

- None
