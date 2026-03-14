## Payments architecture

- **Provider**: Razorpay is the payment gateway for one-time festival creation payments.
- **Model**:
  - `Payment` Prisma model stores amount, currency, status (`PENDING` → `PAID` → `used` flag), provider order/payment IDs, purpose (`FESTIVAL_CREATION`), optional `tier`, and optional `festivalId`.
  - `Festival` stores `tier`, `tierLabel`, `expiresAt`, usage counters, and status (`DRAFT`/`ACTIVE`/`EXPIRED`).

## Domain service

- `src/server/services/payments-domain.service.ts` is the single place for core payment rules:
  - `initiatePaymentDomain` – creates or reuses a PENDING payment and Razorpay order for a given user, tier, and purpose.
  - `verifyPaymentDomain` – verifies Razorpay signature for a specific payment, marks it PAID, and fails other stale pending payments.
  - `verifyPaymentByOrderIdDomain` – supports legacy controller/API flows that work with Razorpay order IDs.
  - `getUserPaymentsDomain` / `getUserStatusDomain` – provide history and status for profile and admin views.

## Integration points

- **Server actions**:
  - `initiateFestivalPayment` / `verifyFestivalPayment` in `src/server/actions/payment.actions.ts` call the domain service and are used by `useFestivalPayment` on the client.
- **API routes**:
  - `/api/payments/verify`, `/api/payments/status`, and `/api/payments/history` delegate to the payment controller, which now calls the domain service.
- **Festival creation**:
  - `createFestival` in `src/server/actions/festival.actions.ts` validates a PAID, unused `Payment` with purpose `FESTIVAL_CREATION`, derives tier/expiry from `TIER_CONFIG`, creates an `ACTIVE` festival, and marks the payment as used.

