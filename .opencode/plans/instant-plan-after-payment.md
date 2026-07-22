# Instant Plan/Credit Card Update After Payment Without Refresh

## Context

After successful payment, user should immediately see their updated Plan and Credit Card info without page refresh.

## Current Flow (Investigate)

Based on exploration, payment flow is:
1. User clicks "Pay to Proceed" in OverviewTab
2. `initiatePayment()` creates Razorpay order
3. Razorpay checkout opens
4. On success, `verifyPayment()` is called
5. Server marks payment as PAID

## Likely Issue

The OverviewTab may not be re-fetching payment/credit data after `verifyPayment()` completes. The `router.refresh()` may not be sufficient for nested query data.

## Investigation Needed

1. How does OverviewTab fetch current plan/credit status?
2. Does `verifyPayment()` server action invalidate relevant queries?
3. Is there optimistic update logic?

## Files to Investigate

| File | Purpose |
|------|---------|
| `src/components/profile/tabs/OverviewTab.tsx` | Payment UI |
| `src/features/billing/actions/billing.actions.ts` | `verifyPayment()` action |
| `src/features/payments/services/payments-domain.service.ts` | Payment verification logic |

## Implementation Plan (Based on Common Pattern)

### Step 1: Ensure proper query invalidation after payment
- [ ] Verify `verifyPayment()` calls `queryClient.invalidateQueries()` for payment-related keys
- [ ] Keys to invalidate: `["payments"]`, `["billing"]`, `["credits"]`, `["me"]`

### Step 2: Add optimistic update or direct state update
- [ ] After payment success, optimistically update local credit display
- [ ] Or trigger immediate refetch of billing data

### Step 3: Test without `router.refresh()`
- [ ] Remove dependency on `router.refresh()` for payment updates
- [ ] Rely on query invalidation + React Query re-fetch

## Blocking

Need to trace actual payment success callback in OverviewTab to see current implementation. May need to read `OverviewTab.tsx` and `billing.actions.ts` directly.

## Effort

Medium - Requires tracing current implementation and fixing query invalidation.
