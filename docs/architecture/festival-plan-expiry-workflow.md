# Festival Plan Expiry Workflow (Brief)

## Goal
- Keep past festivals readable.
- Block all CRUD/mutation actions in read-only lifecycle states.
- Allow only `startDate` and `endDate` updates to reactivate a festival window.

## Lifecycle Rules
- `READY`: festival not started yet, mutations allowed.
- `ONGOING`: current date is inside festival window, mutations allowed.
- `PAST`: festival end date passed, UI + server mutations blocked (read-only).
- `EXPIRED`: plan expired, UI + server mutations blocked (read-only).

## Read-Only Behavior
- Allowed: view pages, exports/downloads, public pages.
- Blocked: create/add/edit/delete/reorder/publish/unpublish/import/upload.
- Exception: date-only update (`startDate`, `endDate`) is allowed in `PAST`.

## Date Window Guard (Plan Boundaries)
- `startDate` must be on/after plan created date (`createdAt`).
- `endDate` must be on/before plan expiry date (`expiresAt`).
- `startDate` must be before or equal to `endDate`.
- Enforced in both UI and server actions.

## Reactivation Flow
1. Festival is `PAST` and read-only.
2. User updates only `startDate` and `endDate` (within plan window).
3. System recalculates lifecycle status.
4. If dates move into active window, status becomes `READY`/`ONGOING`.
5. Full mutations become enabled again.

## Key Implementation Points
- Central lifecycle guard: `assertFestivalMutationAllowed(...)`.
- Shared UI read-only hook: `useFestivalReadOnly()`.
- Festival Live page:
  - Non-date fields disabled in read-only.
  - Date pickers remain enabled.
  - Save button enabled only for valid date-only changes in read-only mode.
