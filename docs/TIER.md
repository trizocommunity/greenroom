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
| **Price** | ₹1,500 | ₹3,000 | ₹6,000 |
| **Duration** | 30 days | 30 days | 30 days |
| **Students** | 250 | 500 | 2,000 |
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
| Categories | ✅ | ✅ | ✅ |
| Groups | ✅ | ✅ | ✅ |
| Students | ✅ | ✅ | ✅ |
| Student Profile (dashboard) | ❌ | ✅ | ✅ |
| Public Student Profile | ❌ | ✅ | ✅ |
| Programmes | ✅ | ✅ | ✅ |
| Assignments | ✅ | ✅ | ✅ |

### Event-Works

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Chest Numbers | ✅ | ✅ | ✅ |
| Results | ✅ | ✅ | ✅ |
| Stage Management | ❌ | ✅ | ✅ |
| Schedule | ❌ | ✅ | ✅ |

### Team & Collaboration

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Members | ❌ | ✅ (max 3) | ✅ (unlimited) |
| Role-Based Access Control | ❌ | ❌ | ✅ |

### Import/Export

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Student Import | ✅ | ✅ | ✅ |
| Student Bulk Upload | ❌ | ✅ | ✅ |
| Programme Bulk Upload | ❌ | ✅ | ✅ |
| PDF Export | ✅ | ✅ | ✅ |
| Excel Export | ❌ | ✅ | ✅ |

### Communication

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Email Notifications | ❌ | ✅ | ✅ |
| WhatsApp Support | ✅ | ✅ | ✅ |
| SMS Notifications | ❌ | ❌ | ✅ |
| Bulk Notifications | ❌ | ❌ | ✅ |

### Reporting & Analytics

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Advanced Analytics | ❌ | ❌ | ✅ |
| Custom Reports | ❌ | ❌ | ✅ |

### Design & Certificates

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Templates | ✅ | ✅ | ✅ |
| QR Codes | ❌ | ✅ | ✅ |
| Auto Certificates | ❌ | ✅ | ✅ |
| Custom Certificate Templates | ❌ | ❌ | ✅ |
| Bulk Certificate Generation | ❌ | ❌ | ✅ |

### Landing Page & Content

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Public Landing Page | ✅ | ✅ | ✅ |
| Full Landing Page | ❌ | ✅ | ✅ |
| Landing Page Builder | ❌ | ❌ | ✅ |
| Gallery | ❌ | ✅ | ✅ |
| News | ❌ | ✅ | ✅ |

### Branding

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Custom URL | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ✅ |
| Logo Upload | ✅ | ✅ | ✅ |
| Custom Colors | ❌ | ✅ | ✅ |
| White-Label | ❌ | ❌ | ✅ |

### Advanced Features

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| API Access | ❌ | ❌ | ✅ |
| Webhooks | ❌ | ❌ | ✅ |
| Live Scoreboard | ✅ | ✅ | ✅ |
| Live Results | ✅ | ❌ | ✅ |
| Multi-Festival Management | ❌ | ❌ | ✅ |

### Settings

| Feature | BASIC | STANDARD | PRO |
|---------|:-----:|:--------:|:---:|
| Festival Settings | ✅ | ✅ | ✅ |
| Advanced Settings | ❌ | ✅ | ✅ |
| Programme Assignment Deadline | ❌ | ✅ | ✅ |

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
