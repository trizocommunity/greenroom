# Student Module Overview

## Purpose
- Keep regular student pages public (when festival setting allows).
- Keep team leader pages private behind dedicated OTP login.
- Use separate team leader auth/session from admin/user auth.

## Route Map
- **Public Student Profile**: `/{slug}/{studentSlug}`
- **Leader Entry**: `/{slug}/{studentSlug}/leader`
- **Leader Login**: `/{slug}/{studentSlug}/leader/login`
- **Leader Protected Pages**:
  - `/{slug}/{studentSlug}/leader/dashboard`
  - `/{slug}/{studentSlug}/leader/assign-programmes`
  - `/{slug}/{studentSlug}/leader/my-students`
  - `/{slug}/{studentSlug}/leader/all-programmes`
  - `/{slug}/{studentSlug}/leader/leaderboard`
- **Leader Redirect Rule**:
  - If student is team leader and visits `/{slug}/{studentSlug}`, redirect to `/{slug}/{studentSlug}/leader`.

## Public vs Private Behavior
- Non-leader students can access their public profile and public subpages.
- Team leaders do not use the non-leader profile flow.
- All leader workflows run under `/leader/*` and require leader session.

## Team Leader Authentication (Email OTP)
- Request OTP by leader email.
- Verify OTP and issue dedicated `tl_session` cookie.
- Session stored in DB (`TeamLeaderSession`) and checked on protected leader routes.
- Logout revokes session and clears cookie.
- Development mode can expose debug OTP for local testing.

## Data Models
- `TeamLeaderOtp`: stores hashed OTP, expiry, attempts, consumed state.
- `TeamLeaderSession`: stores hashed session token, expiry, revoke state, request metadata.
- Linked to `Student` and `Festival` for strict ownership and scope.

## Security Rules
- Leader protected layout validates:
  - session exists
  - session not expired/revoked
  - session student/festival matches route params
- Server actions enforce actor scope:
  - user session or leader session
  - leader can only act inside own festival/group boundaries
- Team leader assignment requires valid email.

## Navigation Rules
- Student navbar profile icon routes to:
  - `/{slug}/{studentSlug}` for non-leaders
  - `/{slug}/{studentSlug}/leader` for leaders
- QR/profile link generation uses shared helper to resolve correct path by role.

## Key Files
- `src/app/(student)/[slug]/[studentSlug]/page.tsx`
- `src/app/(student)/[slug]/[studentSlug]/leader/page.tsx`
- `src/app/(student)/[slug]/[studentSlug]/leader/login/page.tsx`
- `src/app/(student)/[slug]/[studentSlug]/leader/(protected)/layout.tsx`
- `src/lib/team-leader-auth/session.ts`
- `src/lib/team-leader-auth/guard.ts`
- `src/server/services/team-leader-auth.service.ts`
- `src/server/actions/assignment.actions.ts`
- `src/lib/student-profile-url.ts`
- `src/components/student/StudentNavbar.tsx`

## Quick Test Checklist
- Non-leader opens `/{slug}/{studentSlug}` -> public page loads.
- Leader opens `/{slug}/{studentSlug}` -> redirected to `/leader`.
- Leader opens `/leader/*` without login -> redirected to `/leader/login`.
- OTP login works with email and sets leader session.
- Leader session expiration/logout blocks protected routes.
- Leader cannot mutate data outside own festival/group scope.
