# issue-05: Members Page — Invitation Flow, Status Tracking & UI Redesign

**Status:** IN_PROGRESS

## TL;DR

Transform the members page from direct member creation to an invitation-based flow. Add invitation status tracking (pending/expired/active), redesign the members table as responsive cards, add a "How it Works" modal, enforce festival-level duplicate validation, and apply strict form validation parity with other pages.

---

## Problem Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | Adding member creates `festival_member` directly (no invitation flow) | Critical |
| 2 | No invitation status tracking (pending/expired/active) | Critical |
| 3 | Members table not mobile-friendly (uses `<table>`) | Medium |
| 4 | `MEDIA` role missing from `memberRoleEnum` API contract | High |
| 5 | No client-side festival-level duplicate member validation | Medium |
| 7 | AddMemberDialog uses manual state instead of react-hook-form + zod | Medium |
| 8 | OWNER sees delete button (should be read-only) | Medium |
| 9 | Member details dialog shows empty data (wrong property path) | High |
| 10 | Password field is non-functional but displayed | Low |
| 11 | No "How it Works" explanation for invitation flow | Low |
| 12 | Delete button triggers hard delete (no confirmation of flow intent) | Low |

---

## Invitation Flow (Core Change)

### New Flow
```
Add Member Dialog
    │
    ├── [1] User fills: fullName, email, role
    ├── [2] Form validates with zod (fullName min 1, email format, role enum)
    ├── [3] Client checks: is user already a member of THIS festival? (duplicate)
    ├── [4] Submit → createInvitationAction()
    │           │
    │           ├── Creates pendingInvitation record (48h expiry)
    │           ├── Sends invitation email with magic link
    │           └── Returns invitationId
    │
    └── [5] Success → Show toast "Invitation sent", dialog closes

Pending Invitation (in email)
    │
    ├── [6] User clicks link → /invite/{token}
    ├── [7] acceptInvitationAction()
    │           │
    │           ├── Validates token, not expired
    │           ├── Finds or creates user by email
    │           ├── Creates festival_member record
    │           └── Marks invitation as accepted
    │
    └── [8] User redirected to festival dashboard

Member Status States:
    ├── PENDING: invitation exists, not yet accepted (show "Pending" badge)
    ├── EXPIRED: invitation expired before acceptance (show "Expired" badge, allow re-invite)
    └── ACTIVE: festival_member exists with isActive=true (show "Active" badge)
```

### Existing Members
- Existing `festival_member` records remain unchanged
- They show as "Active" status (no invitation tracking needed)

### Re-invite Expired
- If invitation expired, admin can re-invite same email
- Creates new `pendingInvitation` with fresh token and 48h expiry

---

## Sub-task Summary

### Invitation Flow

| # | Description | Files |
|---|-------------|-------|
| **05-A** | Add `MEDIA` to `memberRoleEnum` in API contract | `src/api/contracts/members.ts` |
| **05-B** | Replace `useAddMember` with `useCreateInvitation` hook | `src/api/client/members.ts` |
| **05-C** | Create `usePendingInvitations` hook (fetch pending for festival) | `src/features/invitation/hooks/use-invitations.ts` |
| **05-D** | Update `createInvitationAction` to return computed status | `src/features/invitation/actions/invitation.actions.ts` |
| **05-E** | Remove password field from AddMemberDialog (unused) | `MembersClient.tsx` |
| **05-F** | Add client-side festival-level duplicate check before submit | `MembersClient.tsx` |
### Form Validation (Zod + React Hook Form)

| # | Description | Files |
|---|-------------|-------|
| **05-H** | Convert AddMemberDialog to use `useForm` + `zodResolver` | `MembersClient.tsx` |
| **05-I** | Create `addMemberSchema` with proper validation (min lengths, email, role enum) | `src/api/contracts/members.ts` |

### UI: Cards Instead of Table

| # | Description | Files |
|---|-------------|-------|
| **05-J** | Replace `<Table>` with responsive card layout | `MembersClient.tsx` |
| **05-K** | Show member details: fullName, email, role, status, joined date | `MembersClient.tsx` |
| **05-L** | Mobile: stack cards vertically, full-width | `MembersClient.tsx` |

### Member Details Dialog

| # | Description | Files |
|---|-------------|-------|
| **05-M** | Fix property path: use `member.user?.fullName` not `member.fullName` | `MembersClient.tsx` |
| **05-N** | Show all user details: fullName, email, role, joined date, status | `MembersClient.tsx` |
| **05-O** | Show invitation tracking status (pending/expired/active) if applicable | `MembersClient.tsx` |
| **05-P** | Remove initialPassword display (unused) | `MembersClient.tsx` |

### OWNER Read-Only

| # | Description | Files |
|---|-------------|-------|
| **05-Q** | OWNER sees no delete button (completely hidden, not disabled) | `MembersClient.tsx` |
| **05-R** | Add "How it Works" button with invitation flow explanation | `MembersClient.tsx` |

### API Response

| # | Description | Files |
|---|-------------|-------|
| **05-S** | GET /api/v1/invitations returns computed `status` field | `src/app/api/v1/invitations/route.ts` |

---

## Design: Card Layout

### Desktop (≥768px)
```
┌─────────────────────────────────────────────────────┐
│  Club Members (3)              [+ Add Member] [?]   │
│  ─────────────────────────────────────────────────  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Avatar+Name  │  │ Avatar+Name  │  │ Avatar+Name│ │
│  │ Role Badge   │  │ Role Badge   │  │ Role Badge │ │
│  │ Status Badge │  │ Status Badge │  │ Status     │ │
│  │ Joined Date   │  │ Joined Date   │  │ Joined     │ │
│  │ [Eye] [Trash] │  │ [Eye] [Trash] │  │ [Eye]      │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌─────────────────────────┐
│ Club Members (3)         │
│ [+ Add Member] [?]       │
├─────────────────────────┤
│ ┌───────────────────────┐│
│ │ Avatar  Full Name     ││
│ │         role badge    ││
│ │         status badge  ││
│ │ Email                 ││
│ │ Joined: Jan 15, 2025  ││
│ │        [Eye] [Trash]  ││
│ └───────────────────────┘│
│ ┌───────────────────────┐│
│ │ ... another card ...  ││
│ └───────────────────────┘│
└─────────────────────────┘
```

---

## Design: How it Works Modal

**Trigger:** `?` button next to "Add Member"

**Content:**
1. **Invite** — Fill in the member's name, email, and select their role. An invitation email will be sent automatically.
2. **Pending** — The invitation stays active for 48 hours. If it expires, you can re-invite from the members list.
3. **Accept** — The invitee clicks the link in their email and accepts the invitation.
4. **Active** — Once accepted, the member appears in your list with full access to the festival.

---

## Design: Member Details Dialog

**Fields displayed:**
| Field | Source |
|-------|--------|
| Full Name | `member.user.fullName` |
| Email | `member.user.email` |
| Role | `member.role` |
| Status | `member.isActive ? "Active" : "Inactive"` OR invitation status |
| Joined At | `member.createdAt` (formatted) |
| Invitation Status | `pendingInvitation.status` if applicable (Pending/Expired/Active) |
| Invited By | `pendingInvitation.invitedBy` (user fullName) |
| Invitation Sent | `pendingInvitation.createdAt` |
| Expires At | `pendingInvitation.expiresAt` |

---

## Dependencies

- `src/features/invitation/hooks/use-invitations.ts` — pending invitations hook
- `src/features/invitation/actions/invitation.actions.ts` — invitation actions
- `src/api/contracts/members.ts` — schema validation
- `src/api/client/members.ts` — client hooks
- `src/core/database/schema.ts` — festivalRole enum (includes MEDIA)

---

## Out of Scope

- Soft delete / reactivation of removed members (hard delete remains)
- Changing invitation expiry time (fixed at 48h)
- Bulk invitation (single invite at a time)
- Resend invitation button (re-invite via new invitation)
- Invitation history / audit log
