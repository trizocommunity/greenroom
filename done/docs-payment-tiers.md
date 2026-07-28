# Create TIER Payment Documentation

## Context

Need comprehensive documentation for BASIC, STANDARD, and PRO payment tiers.

## Current State

- BASIC and STANDARD have detailed docs in `docs/plans/`
- PRO plan only has brief summary in `docs/PRDs/GREENROOM_PRD.md` (lines 227-242)
- No unified TIER.md documenting all three tiers
- Pricing config exists in `src/config/pricing.ts`

## Implementation Plan

### Step 1: Create `docs/TIER.md` - Unified Tier Overview
- [ ] Document all three tiers with comparison table
- [ ] Include: price, duration, limits (participants, programmes, events, stages, storage, categories)
- [ ] Document support tiers (WhatsApp 24h, Email 12h, Priority 4h)
- [ ] Note current stage: only PRO integrated, BASIC/STANDARD coded but hidden

### Step 2: Create `docs/plans/PRO_PLAN.md` - Detailed PRO Spec
- [ ] Match format of BASIC_PLAN.md and STANDARD_PLAN.md
- [ ] Document all PRO features/limits
- [ ] Include enforcement details
- [ ] PRO features: RBAC, custom domain, white-label, landing page builder, custom cert templates, bulk cert gen, advanced analytics, custom reports, API access, webhooks, live results, multi-festival management, SMS/bulk notifications, priority support

### Step 3: Update existing tier docs
- [ ] Ensure BASIC_PLAN.md and STANDARD_PLAN.md are consistent with TIER_CONFIG
- [ ] Cross-reference from each plan doc to TIER.md

## Files to Create

| File | Purpose |
|------|---------|
| `docs/TIER.md` | Unified tier comparison and overview |
| `docs/plans/PRO_PLAN.md` | Detailed PRO plan specification |

## Files to Modify

| File | Change |
|------|--------|
| `docs/plans/BASIC_PLAN.md` | Add cross-reference to TIER.md |
| `docs/plans/STANDARD_PLAN.md` | Add cross-reference to TIER.md |

## Reference Files

- `src/config/pricing.ts` - Current TIER_CONFIG values
- `docs/plans/BASIC_PLAN.md` - Existing doc format
- `docs/plans/STANDARD_PLAN.md` - Existing doc format
- `docs/PRDs/GREENROOM_PRD.md` - PRO summary (lines 227-242)

## Effort

Medium - Documentation only, no code changes.
