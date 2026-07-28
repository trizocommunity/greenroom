# Payment Tiers

**Purpose:** Unified overview of all Greenroom payment tiers for festival management.

**Config source:** `src/config/pricing.ts` (`TIER_CONFIG`).

---

## Current Stage Note

> Only **PRO** pricing is displayed in the UI for this stage. **BASIC** and **STANDARD** tiers are coded and fully functional but hidden from the pricing UI. They remain available for future activation.

---

## Tier Comparison

| | BASIC | STANDARD | PRO |
|---|---|---|---|
| **Price** | â‚¹1,500 | â‚¹3,000 | â‚¹6,000 |
| **Duration** | 30 days | 30 days | 30 days |
| **Participants** | 250 | 500 | 2,000 |
| **Programmes** | 100 | 250 | 1,000 |
| **Events** | 10 | 25 | 100 |
| **Stages** | 10 | 20 | 50 |
| **Storage** | 0.5 GB | 2 GB | 10 GB |
| **Categories** | 5 | 10 | 50 |

---

## Support Levels

| Tier | Support Channel | Response Time |
|------|----------------|--------------|
| BASIC | WhatsApp | 24 hours |
| STANDARD | Email | 12 hours |
| PRO | Priority | 4 hours |

---

## Feature Matrix

### Pre-Works

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Categories | âœ… | âœ… | âœ… |
| Groups | âœ… | âœ… | âœ… |
| Participants | âœ… | âœ… | âœ… |
| Participant Profile (dashboard) | âŒ | âœ… | âœ… |
| Public Participant Profile | âŒ | âœ… | âœ… |
| Programmes | âœ… | âœ… | âœ… |
| Assignments | âœ… | âœ… | âœ… |

### Event-Works

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Chest Numbers | âœ… | âœ… | âœ… |
| Results | âœ… | âœ… | âœ… |
| Stage Management | âŒ | âœ… | âœ… |
| Schedule | âŒ | âœ… | âœ… |

### Team & Collaboration

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Members | âŒ | âœ… (max 3) | âœ… (unlimited) |
| Role-Based Access Control | âŒ | âŒ | âœ… |

### Import/Export

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Participant Import | âœ… | âœ… | âœ… |
| Participant Bulk Upload | âŒ | âœ… | âœ… |
| Programme Bulk Upload | âŒ | âœ… | âœ… |
| PDF Export | âœ… | âœ… | âœ… |
| Excel Export | âŒ | âœ… | âœ… |

### Communication

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Email Notifications | âŒ | âœ… | âœ… |
| WhatsApp Support | âœ… | âœ… | âœ… |
| SMS Notifications | âŒ | âŒ | âœ… |
| Bulk Notifications | âŒ | âŒ | âœ… |

### Reporting & Analytics

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Advanced Analytics | âŒ | âŒ | âœ… |
| Custom Reports | âŒ | âŒ | âœ… |

### Design & Certificates

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Templates | âœ… | âœ… | âœ… |
| QR Codes | âŒ | âœ… | âœ… |
| Auto Certificates | âŒ | âœ… | âœ… |
| Custom Certificate Templates | âŒ | âŒ | âœ… |
| Bulk Certificate Generation | âŒ | âŒ | âœ… |

### Landing Page & Content

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Public Landing Page | âœ… | âœ… | âœ… |
| Full Landing Page | âŒ | âœ… | âœ… |
| Landing Page Builder | âŒ | âŒ | âœ… |
| Media | âŒ | âœ… | âœ… |
| News | âŒ | âœ… | âœ… |

### Branding

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Custom URL | âŒ | âœ… | âœ… |
| Custom Domain | âŒ | âŒ | âœ… |
| Logo Upload | âœ… | âœ… | âœ… |
| Custom Colors | âŒ | âœ… | âœ… |
| White-Label | âŒ | âŒ | âœ… |

### Advanced Features

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| API Access | âŒ | âŒ | âœ… |
| Webhooks | âŒ | âŒ | âœ… |
| Live Scoreboard | âœ… | âœ… | âœ… |
| Live Results | âœ… | âŒ | âœ… |
| Multi-Festival Management | âŒ | âŒ | âœ… |

### Settings

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Festival Settings | âœ… | âœ… | âœ… |
| Advanced Settings | âŒ | âœ… | âœ… |
| Programme Assignment Deadline | âŒ | âœ… | âœ… |

---

## Post-Expiry Behavior

All tiers: `postExpiryAccess: "delete"`, `dataRetentionDays: 0`. No read-only access after expiry.

---

## Detailed Documentation

- [BASIC Plan](./plans/BASIC_PLAN.md)
- [STANDARD Plan](./plans/STANDARD_PLAN.md)
- [PRO Plan](./plans/PRO_PLAN.md)

---

## Key Files

| Area | File |
|------|------|
| Tier & limits config | `src/config/pricing.ts` |
| Feature flags (config-only) | `src/lib/features.ts` |
| Effective features (config + overrides) | `src/server/services/plan-features.service.ts` |
| Client feature hooks | `src/hooks/useFeature.ts` |
| Dashboard layout & context | `src/app/dashboard/[slug]/layout.tsx` |
| Sidebar filtering | `src/components/festival/dashboard/FestivalDashboardSidebar.tsx` |
