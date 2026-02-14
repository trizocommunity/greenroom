# 🎯 Pricing Plan Implementation Guide
## Technical Separation & Enforcement Strategy

**Version:** 1.0  
**Last Updated:** February 10, 2026  
**Purpose:** Technical implementation guide for enforcing plan-based features and limits

---

## 📊 System Architecture Overview

### Current Implementation Status

✅ **Already Implemented:**
- Tier-based limits (Students, Programmes, Events, Stages, Storage)
- `TIER_CONFIG` configuration system
- `UsageCounterService` for atomic limit enforcement
- Tier validation on Festival creation
- Prisma schema with tier field

⚠️ **Needs Implementation:**
- Feature flags based on tier
- UI component visibility control
- Advanced feature restrictions
- Add-on management system
- Team member limits enforcement

---

## 🏗️ Implementation Strategy

### 1. **Limit-Based Features** (Already Implemented ✅)

These are enforced by the database and backend validation.

**Current Implementation:**
```typescript
// src/config/pricing.ts
export const TIER_CONFIG: Record<Tier, any> = {
  BASIC: {
    limits: {
      students: 250,
      programmes: 100,
      events: 10,
      stages: 2,
      storageMB: 512,
    },
  },
  STANDARD: {
    limits: {
      students: 500,
      programmes: 250,
      events: 25,
      stages: 20,
      storageMB: 2048,
    },
  },
  PRO: {
    limits: {
      students: 2000,
      programmes: 1000,
      events: 100,
      stages: 50,
      storageMB: 10240,
    },
  },
};
```

**How It Works:**
- `UsageCounterService.incrementUsage()` checks limits before creation
- Atomic transactions prevent race conditions
- Frontend displays usage vs limits in `LimitationCard`
- Validation happens on:
  - Student creation
  - Programme creation
  - Event creation
  - Stage creation
  - File uploads

---

### 2. **Feature Flags System** (Needs Implementation 🔨)

Create a feature flag system to enable/disable features per tier.

**Recommended Implementation:**

#### **Step 2.1: Extend TIER_CONFIG**

```typescript
// src/config/pricing.ts
export const TIER_CONFIG: Record<Tier, any> = {
  BASIC: {
    price: 1500,
    label: "Basic",
    durationDays: 30,
    limits: { /* ... existing limits ... */ },
    features: {
      // Pre-Works Access
      categories: true,
      groups: true,
      students: true,
      programmes: true,
      assignments: true,
      
      // Event-Works Access
      chestNumbers: true,
      results: true,
      stageManagement: false,
      schedule: false,
      
      // Team & Collaboration
      maxTeamMembers: 1, // Owner only
      members: false, // No team member management UI
      roleBasedAccess: false,
      
      // Import/Export
      studentImport: true, // CSV only
      studentBulkUpload: false,
      programmeBulkUpload: false,
      pdfExport: true,
      excelExport: false,
      
      // Communication
      emailNotifications: false,
      whatsappSupport: true, // 24h response
      smsNotifications: false,
      bulkNotifications: false,
      
      // Reporting & Analytics
      advancedAnalytics: false,
      customReports: false,
      
      // Certificates & QR
      qrCodes: false,
      autoCertificates: false,
      customCertificateTemplates: false,
      bulkCertificateGeneration: false,
      
      // Landing Page
      publicLandingPage: true, // Basic version only
      fullLandingPage: false,
      landingPageBuilder: false,
      
      // Branding
      customUrl: false,
      customDomain: false,
      logoUpload: true, // Basic logo only
      customColors: false,
      whiteLabel: false,
      
      // Advanced Features
      apiAccess: false,
      webhooks: false,
      liveScoreboard: false,
      liveResults: false,
      multiFestivalManagement: false,
      
      // Settings
      festivalSettings: false, // No settings page
      advancedSettings: false,
      
      // Support
      supportLevel: 'whatsapp', // 'whatsapp' | 'priority' | 'premium'
      supportResponseTime: 24, // hours
      
      // Post-Expiry
      postExpiryAccess: 'delete', // 'readonly' | 'delete'
      dataRetentionDays: 0, // Delete immediately
    },
  },
  
  STANDARD: {
    price: 3000,
    label: "Standard",
    durationDays: 90,
    limits: { /* ... existing limits ... */ },
    features: {
      // Team & Collaboration
      maxTeamMembers: 5,
      roleBasedAccess: true,
      
      // Communication
      emailNotifications: true,
      whatsappSupport: true,
      smsNotifications: false, // Add-on
      bulkNotifications: false,
      
      // Reporting & Export
      pdfExport: true,
      excelExport: true,
      customReports: false,
      advancedAnalytics: true,
      
      // Certificates
      autoCertificates: true,
      customCertificateTemplates: false,
      bulkCertificateGeneration: true,
      
      // Branding
      customUrl: true, // subdomain
      customDomain: false,
      logoUpload: true,
      customColors: true,
      whiteLabel: false,
      
      // Advanced Features
      apiAccess: false,
      webhooks: false,
      liveScoreboard: true,
      liveResults: true,
      multiFestivalManagement: false,
      
      // Support
      supportLevel: 'priority',
      supportResponseTime: 24,
    },
  },
  
  PRO: {
    price: 6000,
    label: "Pro",
    durationDays: 180,
    limits: { /* ... existing limits ... */ },
    features: {
      // Team & Collaboration
      maxTeamMembers: -1, // unlimited
      roleBasedAccess: true,
      
      // Communication
      emailNotifications: true,
      whatsappSupport: true,
      smsNotifications: true, // Included, but usage-based
      bulkNotifications: true,
      
      // Reporting & Export
      pdfExport: true,
      excelExport: true,
      customReports: true,
      advancedAnalytics: true,
      
      // Certificates
      autoCertificates: true,
      customCertificateTemplates: true,
      bulkCertificateGeneration: true,
      
      // Branding
      customUrl: true,
      customDomain: true,
      logoUpload: true,
      customColors: true,
      whiteLabel: true,
      
      // Advanced Features
      apiAccess: true,
      webhooks: true,
      liveScoreboard: true,
      liveResults: true,
      multiFestivalManagement: true,
      
      // Support
      supportLevel: 'premium',
      supportResponseTime: 1, // 24/7 support
    },
  },
};
```

---

#### **Step 2.2: Create Feature Check Utility**

```typescript
// src/lib/features.ts
import { TIER_CONFIG } from '@/config/pricing';
import type { Tier } from '@prisma/client';

export class FeatureService {
  /**
   * Check if a feature is enabled for a given tier
   */
  static isFeatureEnabled(
    tier: Tier,
    featurePath: string
  ): boolean {
    const features = TIER_CONFIG[tier]?.features;
    if (!features) return false;
    
    // Support nested paths like 'certificates.auto'
    const keys = featurePath.split('.');
    let value: any = features;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return false;
    }
    
    return Boolean(value);
  }
  
  /**
   * Get feature value (useful for numeric limits like maxTeamMembers)
   */
  static getFeatureValue<T = any>(
    tier: Tier,
    featurePath: string
  ): T | null {
    const features = TIER_CONFIG[tier]?.features;
    if (!features) return null;
    
    const keys = featurePath.split('.');
    let value: any = features;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return null;
    }
    
    return value as T;
  }
  
  /**
   * Check if tier has access to a specific support level
   */
  static hasSupportLevel(
    tier: Tier,
    requiredLevel: 'email' | 'priority' | 'premium'
  ): boolean {
    const levels = ['email', 'priority', 'premium'];
    const tierLevel = this.getFeatureValue<string>(tier, 'supportLevel');
    const tierLevelIndex = levels.indexOf(tierLevel || 'email');
    const requiredLevelIndex = levels.indexOf(requiredLevel);
    
    return tierLevelIndex >= requiredLevelIndex;
  }
}
```

---

#### **Step 2.3: Create React Hook for Feature Checks**

```typescript
// src/hooks/useFeature.ts
'use client';

import { useFestival } from '@/components/festival/FestivalContext';
import { FeatureService } from '@/lib/features';

export function useFeature(featurePath: string): boolean {
  const festival = useFestival();
  const tier = festival?.tier || 'BASIC';
  
  return FeatureService.isFeatureEnabled(tier, featurePath);
}

export function useFeatureValue<T = any>(featurePath: string): T | null {
  const festival = useFestival();
  const tier = festival?.tier || 'BASIC';
  
  return FeatureService.getFeatureValue<T>(tier, featurePath);
}

// Example usage in components:
// const canExportExcel = useFeature('excelExport');
// const maxTeamMembers = useFeatureValue<number>('maxTeamMembers');
```

---

### 3. **UI Component Visibility Control** (Implementation Example 🔨)

#### **Example: Conditional Export Button**

```typescript
// src/components/festival/students/StudentsList.tsx
import { useFeature } from '@/hooks/useFeature';

export function StudentsList() {
  const canExportPdf = useFeature('pdfExport');
  const canExportExcel = useFeature('excelExport');
  
  return (
    <div>
      {/* ... student list ... */}
      
      <div className="flex gap-2">
        {canExportPdf && (
          <Button onClick={handlePdfExport}>
            Export PDF
          </Button>
        )}
        
        {canExportExcel ? (
          <Button onClick={handleExcelExport}>
            Export Excel
          </Button>
        ) : (
          <UpgradeTrigger
            feature="Excel Export"
            requiredTier="STANDARD"
          >
            <Button disabled>
              <Lock className="w-4 h-4 mr-2" />
              Export Excel (Upgrade)
            </Button>
          </UpgradeTrigger>
        )}
      </div>
    </div>
  );
}
```

---

#### **Example: Upgrade Trigger Component**

```typescript
// src/components/common/UpgradeTrigger.tsx
'use client';

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface UpgradeTriggerProps {
  feature: string;
  requiredTier: 'STANDARD' | 'PRO';
  children: React.ReactNode;
}

export function UpgradeTrigger({
  feature,
  requiredTier,
  children,
}: UpgradeTriggerProps) {
  const router = useRouter();
  
  return (
    <TooltipProvider>
      <div className="relative inline-block">
        {children}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-orange-500 hover:bg-orange-600"
              onClick={() => router.push('/pricing')}
            >
              <Info className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{feature} is available in {requiredTier} plan</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click to view upgrade options
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

---

### 4. **Backend Feature Validation** (Implementation 🔨)

Always validate features on the backend, never trust the frontend.

#### **Example: Certificate Generation Action**

```typescript
// src/server/actions/certificate.actions.ts
'use server';

import { getCurrentUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { FeatureService } from '@/lib/features';

export async function generateCertificate(
  festivalId: string,
  studentId: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
  });
  
  if (!festival) throw new Error('Festival not found');
  
  // Check if feature is enabled for this tier
  if (!FeatureService.isFeatureEnabled(festival.tier, 'autoCertificates')) {
    throw new Error(
      `Certificate generation is not available in ${festival.tier} plan. Please upgrade to STANDARD or higher.`
    );
  }
  
  // Proceed with certificate generation
  // ...
}
```

---

### 5. **Team Member Limit Enforcement** (Implementation 🔨)

#### **Schema Update**

```prisma
// prisma/schema.prisma
model FestivalMember {
  // ... existing fields ...
}

// No changes needed - we'll enforce via application logic
```

#### **Backend Validation**

```typescript
// src/server/actions/festival-member.actions.ts
'use server';

import { FeatureService } from '@/lib/features';
import { prisma } from '@/lib/db';

export async function addTeamMember(
  festivalId: string,
  userId: string,
  role: FestivalRole
) {
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    include: {
      members: { where: { isActive: true } },
    },
  });
  
  if (!festival) throw new Error('Festival not found');
  
  const maxTeamMembers = FeatureService.getFeatureValue<number>(
    festival.tier,
    'maxTeamMembers'
  );
  
  if (maxTeamMembers === null) throw new Error('Invalid tier configuration');
  
  // -1 means unlimited
  if (maxTeamMembers !== -1 && festival.members.length >= maxTeamMembers) {
    throw new Error(
      `Team member limit reached for ${festival.tier} plan (${maxTeamMembers} members). ` +
      `Please upgrade to add more team members.`
    );
  }
  
  // Proceed with adding member
  return prisma.festivalMember.create({
    data: {
      festivalId,
      userId,
      role,
    },
  });
}
```

---

### 6. **Add-on Management System** (New Implementation 🆕)

#### **Schema for Add-ons**

```prisma
// prisma/schema.prisma
model FestivalAddon {
  id         String   @id @default(uuid())
  festivalId String
  festival   Festival @relation(fields: [festivalId], references: [id], onDelete: Cascade)
  
  addonType  AddonType
  quantity   Int      @default(1)
  price      Int      // In paisa/cents
  
  // For usage tracking (e.g., SMS sent)
  usageCount Int      @default(0)
  usageLimit Int?     // null = unlimited
  
  expiresAt  DateTime?
  isActive   Boolean  @default(true)
  
  purchasedAt DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("festival_addon")
}

enum AddonType {
  EXTRA_STORAGE_5GB
  EXTRA_STORAGE_10GB
  EXTRA_STORAGE_25GB
  SMS_PACK_1K
  SMS_PACK_5K
  DURATION_30_DAYS
  DURATION_60_DAYS
  DURATION_90_DAYS
  EXTRA_TEAM_MEMBER
  LIVE_STREAMING
  CUSTOM_CERTIFICATE
  PRIORITY_SUPPORT
  BULK_WHATSAPP
}

// Add to Festival model
model Festival {
  // ... existing fields ...
  addons FestivalAddon[]
}
```

#### **Add-on Configuration**

```typescript
// src/config/addons.ts
export const ADDON_CONFIG = {
  EXTRA_STORAGE_5GB: {
    label: 'Extra 5GB Storage',
    price: 500,
    type: 'storage',
    value: 5120, // MB
  },
  SMS_PACK_1K: {
    label: 'SMS Pack (1,000 messages)',
    price: 1000,
    type: 'usage',
    usageLimit: 1000,
  },
  DURATION_30_DAYS: {
    label: 'Extra 30 Days',
    price: 500,
    type: 'duration',
    daysToAdd: 30,
  },
  EXTRA_TEAM_MEMBER: {
    label: 'Additional Team Member',
    price: 200,
    type: 'monthly',
    recurringMonths: 1,
  },
  // ... more add-ons
};
```

---

### 7. **Storage Limit Enforcement** (Implementation 🔨)

```typescript
// src/server/services/storage.service.ts
import { FeatureService } from '@/lib/features';
import { prisma } from '@/lib/db';

export class StorageService {
  static async checkStorageLimit(
    festivalId: string,
    fileSizeMB: number
  ): Promise<void> {
    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        addons: {
          where: {
            addonType: {
              in: ['EXTRA_STORAGE_5GB', 'EXTRA_STORAGE_10GB', 'EXTRA_STORAGE_25GB'],
            },
            isActive: true,
          },
        },
      },
    });
    
    if (!festival) throw new Error('Festival not found');
    
    // Base storage limit
    const baseLimit = TIER_CONFIG[festival.tier].limits.storageMB;
    
    // Add storage from add-ons
    const addonStorage = festival.addons.reduce((total, addon) => {
      const config = ADDON_CONFIG[addon.addonType];
      return total + (config?.value || 0);
    }, 0);
    
    const totalLimit = baseLimit + addonStorage;
    const currentUsage = festival.storageUsedMB;
    
    if (currentUsage + fileSizeMB > totalLimit) {
      throw new Error(
        `Storage limit exceeded. Used: ${currentUsage}MB, ` +
        `Limit: ${totalLimit}MB, New file: ${fileSizeMB}MB`
      );
    }
  }
  
  static async incrementStorageUsage(
    festivalId: string,
    sizeMB: number
  ): Promise<void> {
    await this.checkStorageLimit(festivalId, sizeMB);
    
    await prisma.festival.update({
      where: { id: festivalId },
      data: {
        storageUsedMB: { increment: sizeMB },
      },
    });
  }
}
```

---

### 8. **Feature Toggle UI Component** (Implementation 🔨)

```typescript
// src/components/common/FeatureGate.tsx
'use client';

import { useFeature } from '@/hooks/useFeature';
import { UpgradeTrigger } from './UpgradeTrigger';

interface FeatureGateProps {
  feature: string;
  requiredTier?: 'STANDARD' | 'PRO';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({
  feature,
  requiredTier,
  fallback,
  children,
}: FeatureGateProps) {
  const hasAccess = useFeature(feature);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (requiredTier) {
    return (
      <UpgradeTrigger feature={feature} requiredTier={requiredTier}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </UpgradeTrigger>
    );
  }
  
  return null;
}

// Usage example:
// <FeatureGate feature="excelExport" requiredTier="STANDARD">
//   <ExportExcelButton />
// </FeatureGate>
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Set up TIER_CONFIG with limits
- [x] Implement UsageCounterService
- [x] Add tier field to Festival model
- [ ] Extend TIER_CONFIG with feature flags
- [ ] Create FeatureService utility
- [ ] Create useFeature hook

### Phase 2: Core Features (Week 2)
- [ ] Implement team member limit enforcement
- [ ] Add backend feature validation
- [ ] Create FeatureGate component
- [ ] Create UpgradeTrigger component
- [ ] Update existing components with feature checks

### Phase 3: Add-ons (Week 3)
- [ ] Create FestivalAddon schema
- [ ] Implement add-on purchase flow
- [ ] Add add-on management UI
- [ ] Implement storage add-on logic
- [ ] Implement SMS pack tracking

### Phase 4: Advanced Features (Week 4)
- [ ] Implement certificate generation (STANDARD+)
- [ ] Add custom branding options (STANDARD+)
- [ ] Implement API access (PRO only)
- [ ] Add webhook support (PRO only)
- [ ] Implement white-label mode (PRO only)

---

## 📋 Implementation Checklist

### Backend
- [ ] Extend TIER_CONFIG with feature flags
- [ ] Create FeatureService class
- [ ] Add FestivalAddon model to schema
- [ ] Implement team member validation
- [ ] Add storage limit with add-ons
- [ ] Create add-on purchase actions
- [ ] Add feature validation to all actions

### Frontend
- [ ] Create useFeature hook
- [ ] Create useFeatureValue hook
- [ ] Build FeatureGate component
- [ ] Build UpgradeTrigger component
- [ ] Update all components with feature gates
- [ ] Add upgrade CTAs
- [ ] Create add-on management UI

### Testing
- [ ] Test limit enforcement
- [ ] Test feature flag toggling
- [ ] Test upgrade flow
- [ ] Test add-on purchases
- [ ] Test team member limits
- [ ] Test storage limits

---

## 🎯 Best Practices

### 1. **Always Validate on Backend**
Never rely solely on frontend checks - always validate features and limits server-side.

### 2. **Graceful Degradation**
Show locked features with upgrade prompts instead of hiding them completely.

### 3. **Clear Messaging**
Explain why a feature is locked and what plan unlocks it.

### 4. **Consistent Enforcement**
Use the same FeatureService across all code paths.

### 5. **Add-ons Over Hard Limits**
Allow users to purchase add-ons instead of forcing upgrades.

---

## 📚 Example Use Cases

### Use Case 1: Excel Export
```typescript
// Backend validation
if (!FeatureService.isFeatureEnabled(festival.tier, 'excelExport')) {
  throw new Error('Excel export requires STANDARD plan or higher');
}

// Frontend check
const canExportExcel = useFeature('excelExport');
```

### Use Case 2: Team Member Addition
```typescript
// Backend validation
const maxMembers = FeatureService.getFeatureValue<number>(
  festival.tier,
  'maxTeamMembers'
);
if (maxMembers !== -1 && currentMembers >= maxMembers) {
  throw new Error('Team member limit reached');
}

// Frontend check
const maxTeamMembers = useFeatureValue<number>('maxTeamMembers');
const canAddMore = maxTeamMembers === -1 || currentCount < maxTeamMembers;
```

### Use Case 3: Custom Branding
```typescript
// Show/hide color picker based on tier
<FeatureGate feature="customColors" requiredTier="STANDARD">
  <ColorPicker />
</FeatureGate>
```

---

## 📊 Results System (Implemented ✅)

### Overview
The Results System allows admins to enter competition results with grades and points, then publish them to the public site. It's available for all tiers.

### Database Schema
```prisma
model Result {
  id            String              @id @default(uuid())
  festivalId    String
  programmeId   String
  assignmentId  String              @unique
  
  // Scoring & Ranking
  score         Float?              // Total marks/score
  grade         String?             // A+, A, B+, B, C, etc.
  position      Int?                // 1, 2, 3 (rank)
  points        Int                 @default(0)
  
  // Metadata
  remarks       String?
  isPublished   Boolean             @default(false)
  
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
}
```

### Admin Workflow
1. Navigate to `/dashboard/[slug]/results`
2. Select Programme from dropdown
3. For each participant:
   - Select Position (1-5) → Auto-assigns points
   - Select Grade (A+ to E) - Optional
   - Enter Score - Optional
   - Add Remarks - Optional
4. Save individual results
5. Bulk publish programme or all results

### Points System
- 1st Place: 10 points
- 2nd Place: 7 points
- 3rd Place: 5 points
- 4th Place: 3 points
- 5th Place: 2 points

### Public Display
- **BASIC Plan**: Results appear on main landing page (`/{slug}`)
- **STANDARD/PRO**: Results available at `/{slug}/results`
- Displays grouped by programme with position icons, grades, scores, and points

### Key Files
- `src/server/models/result.model.ts` - CRUD operations
- `src/server/actions/results.ts` - Server actions
- `src/server/loader/festivalResults.ts` - Public data loader
- `src/components/dashboard/results/ResultsManagementClient.tsx` - Admin UI
- `src/components/festival/landing/ResultsList.tsx` - Public display

---

**This guide provides a complete framework for implementing tier-based feature separation in GreenRoom. Follow the roadmap and checklist to ensure consistent enforcement across the application.**
