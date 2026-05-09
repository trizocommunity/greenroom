# Date-Time Handling Policy

## Problem

Different parts of the app were parsing and formatting timestamps differently (`new Date(...)`, `toLocaleString()`, and ad-hoc conversions). This caused fixed-offset display issues in profile, dashboard, pre-event, event-works, and super-admin screens.

## Policy

- Treat stored DB timestamps as **UTC instants**.
- Parse DB timestamp values only through shared utilities.
- Format user-visible timestamps through shared utilities.
- Avoid direct `new Date(rawString)` for DB values in feature/UI code.

## Approved Utilities

Use `src/core/utils/date-time.ts`:

- `parseStoredInstant(value)`
- `formatStoredDateTime(value, options, locales)`
- `toDateOrNull(value)`

## Do / Don't

- Do: `formatStoredDateTime(row.createdAt, { dateStyle: "medium", timeStyle: "short" })`
- Do: `format(parseStoredInstant(payment.createdAt), "MMM d, yyyy")`
- Don't: `new Date(row.createdAt).toLocaleString()`
- Don't: `new Date(raw).toISOString().slice(0, 16)` for persisted datetime fields

## Migration Notes

- Existing data may be `timestamp without time zone`; parsing must normalize missing-zone strings.
- Any schema migration to `timestamptz` must include a data interpretation plan (UTC vs local-wall-clock semantics per column).

## Rollout Tracking

Patched in this phase:

- `JudgmentWizardClient`
- `ProgrammeReportingClient`
- `SettingsForm`
- `ResultsManagementClient`
- Profile payment and festival cards
- Dashboard overview widgets
- Pre-event deadlines and schedule metadata
- Super-admin festival/payments/users pages

Remaining follow-up should continue replacing raw date parsing patterns repo-wide.