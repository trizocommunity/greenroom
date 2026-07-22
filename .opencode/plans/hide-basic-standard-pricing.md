# Show Only PRO Tier in Pricing (Hide BASIC and STANDARD)

## Context

For current stage, only PRO tier should be displayed in pricing UI. BASIC and STANDARD are coded but should not be shown to users.

## Current State

### Pricing Page (`src/app/(public)/pricing/page.tsx`)
- Shows all three tiers: BASIC (₹1,500), STANDARD (₹3,000), PRO (₹6,000)
- PricingCard component renders all tiers

### Profile Overview Tab (`src/components/profile/tabs/OverviewTab.tsx`)
- Shows tier selection cards for all tiers
- "Pay to Proceed" buttons for each tier

### Pricing Card Component (`src/components/pricing/PricingCard.tsx`)
- Renders tier name, price, features, CTA button
- Has "Recommended" badge on STANDARD

## Implementation Plan

### Step 1: Update PricingCard to accept tier filter
- [ ] Add optional `visibleTiers?: Tier[]` prop
- [ ] Filter out hidden tiers before rendering

### Step 2: Update pricing page to show only PRO
- [ ] `src/app/(public)/pricing/page.tsx` - pass `visibleTiers={["PRO"]}`

### Step 3: Update OverviewTab to show only PRO
- [ ] Filter tier options to only PRO
- [ ] Update credit validity display for PRO-only

### Step 4: Create `docs/TIER.md` note
- [ ] Add section explaining: "Only PRO pricing is displayed. BASIC and STANDARD tiers are coded but hidden from the pricing UI for this stage."

## Files to Modify

| File | Change |
|------|--------|
| `src/components/pricing/PricingCard.tsx` | Add tier visibility filter |
| `src/app/(public)/pricing/page.tsx` | Show only PRO |
| `src/components/profile/tabs/OverviewTab.tsx` | Show only PRO tier option |
| `docs/TIER.md` | Add "current stage" note |

## Effort

Small - 3-4 files, simple prop filtering.
