# 🌱 BASIC Plan Implementation Guide
## Focused Implementation for Entry-Level Festivals

**Version:** 1.0  
**Last Updated:** February 10, 2026  
**Plan:** BASIC (₹1,500 / 30 Days)

---

## 📋 BASIC Plan Specifications

### **Pricing & Duration**
- **Price:** ₹1,500
- **Duration:** 30 Days
- **Target:** Small local festivals, schools, first-time organizers

### **Core Limits**
```typescript
{
  students: 250,
  programmes: 100,
  events: 10,
  stages: 2,
  storageMB: 512, // 0.5 GB
}
```

### **Post-Expiry Behavior**
⚠️ **IMPORTANT CHANGE:** Delete all festival data after expiry (no read-only access)

---

## ✅ Features INCLUDED in BASIC Plan

### **Pre-Works**
1. ✅ **Categories** - Category management
2. ✅ **Groups** - Group management
3. ✅ **Students** - Student management with Excel/CSV import
4. ✅ **Programmes** - Programme management (manual only, no bulk)
5. ✅ **Assignments** - Programme assignment to students

### **Event-Works**
1. ✅ **Chest Numbers** - Chest number generation
2. ✅ **Results** - Result entry with **position, grade, score, and points**, plus public publishing

### **Reports & Export**
1. ✅ **PDF Export** - Basic reports in PDF format

### **Landing Page**
1. ✅ **Basic Public Page** - Only festival title + results (simplified)

### **Support**
1. ✅ **WhatsApp Support** - 24-hour response time

---

## ❌ Features EXCLUDED from BASIC Plan

### **Excluded from UI (Hide)**
1. ❌ **Full Landing Page** - No custom landing page builder
2. ❌ **Bulk Upload** - No bulk student/programme upload
3. ❌ **Settings** - No festival settings page
4. ❌ **Members** - No team member management
5. ❌ **QR Codes** - No QR code generation
6. ❌ **Stage Management** - No stage management tools
7. ❌ **Schedule** - No scheduling features
8. ❌ **Advanced Analytics** - No analytics dashboard
9. ❌ **Excel Export** - No Excel/CSV export
10. ❌ **Certificates** - No certificate generation
11. ❌ **Email Notifications** - No automated emails
12. ❌ **Custom Branding** - No custom colors/themes
13. ❌ **Live Scoreboard** - No live results display

---

## 🔧 Implementation: TIER_CONFIG Update

```typescript
// src/config/pricing.ts
export const TIER_CONFIG: Record<Tier, any> = {
  BASIC: {
    price: 1500,
    label: "Basic",
    durationDays: 30,
    limits: {
      students: 250,
      programmes: 100,
      events: 10,
      stages: 2,
      storageMB: 512, // 0.5 GB
    },
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
      
      // Import/Export
      studentImport: true, // Excel/CSV
      studentBulkUpload: false,
      programmeBulkUpload: false,
      pdfExport: true,
      excelExport: false,
      
      // Landing Page
      publicLandingPage: true, // Simplified version
      fullLandingPage: false,
      landingPageBuilder: false,
      
      // Team & Members
      members: false,
      maxTeamMembers: 1, // Only owner
      roleBasedAccess: false,
      
      // Certificates & QR
      qrCodes: false,
      certificates: false,
      autoCertificates: false,
      
      // Communication
      emailNotifications: false,
      whatsappSupport: true,
      smsNotifications: false,
      
      // Analytics & Reports
      advancedAnalytics: false,
      customReports: false,
      liveScoreboard: false,
      
      // Branding
      customColors: false,
      customLogo: true, // Basic logo only
      customDomain: false,
      
      // Settings
      festivalSettings: false,
      advancedSettings: false,
      
      // Support
      supportLevel: 'whatsapp',
      supportResponseTime: 24, // hours
      
      // Post-Expiry
      postExpiryAccess: 'delete', // 'readonly' | 'delete'
      dataRetentionDays: 0, // Delete immediately on expiry
    },
  },
  
  // ... STANDARD and PRO remain the same
};
```

---

## 🎯 Implementation Steps

### **Step 1: Update Sidebar Navigation**

```typescript
// src/components/festival/dashboard/FestivalDashboardSidebar.tsx
import { useFeature } from '@/hooks/useFeature';

export function FestivalDashboardSidebar({ festival, role }: Props) {
  const hasMembers = useFeature('members');
  const hasSettings = useFeature('festivalSettings');
  const hasStageManagement = useFeature('stageManagement');
  const hasSchedule = useFeature('schedule');
  
  const menuItems = [
    // Always visible
    {
      title: "Pre-Works",
      items: [
        { label: "Categories", href: `/dashboard/${festival.slug}/pre-works/categories`, icon: Tag },
        { label: "Groups", href: `/dashboard/${festival.slug}/pre-works/groups`, icon: Users },
        { label: "Students", href: `/dashboard/${festival.slug}/pre-works/students`, icon: GraduationCap },
        { label: "Programmes", href: `/dashboard/${festival.slug}/pre-works/programmes`, icon: Trophy },
        { label: "Assignments", href: `/dashboard/${festival.slug}/pre-works/assignments`, icon: ClipboardList },
      ],
    },
    {
      title: "Event-Works",
      items: [
        { label: "Chest Numbers", href: `/dashboard/${festival.slug}/event-works/chest-numbers`, icon: Hash },
        { label: "Results", href: `/dashboard/${festival.slug}/event-works/results`, icon: Award },
        // Conditionally show based on tier
        ...(hasStageManagement ? [
          { label: "Stage Management", href: `/dashboard/${festival.slug}/event-works/stage-management`, icon: Layout }
        ] : []),
        ...(hasSchedule ? [
          { label: "Schedule", href: `/dashboard/${festival.slug}/event-works/schedule`, icon: Calendar }
        ] : []),
      ],
    },
  ];
  
  // Conditionally add Settings and Members
  if (hasSettings || hasMembers) {
    menuItems.push({
      title: "Configuration",
      items: [
        ...(hasSettings ? [
          { label: "Settings", href: `/dashboard/${festival.slug}/settings`, icon: Settings }
        ] : []),
        ...(hasMembers ? [
          { label: "Members", href: `/dashboard/${festival.slug}/members`, icon: UserPlus }
        ] : []),
      ],
    });
  }
  
  return (
    // ... render menu items
  );
}
```

---

### **Step 2: Hide Bulk Upload Buttons**

```typescript
// src/components/festival/pre-works/students/StudentsClient.tsx
import { useFeature } from '@/hooks/useFeature';
import { UpgradeTrigger } from '@/components/common/UpgradeTrigger';

export function StudentsClient() {
  const canBulkUpload = useFeature('studentBulkUpload');
  const canImportCSV = useFeature('studentImport');
  
  return (
    <div>
      {/* Single student creation - always available */}
      <Button onClick={openCreateDialog}>Add Student</Button>
      
      {/* CSV Import - Available in BASIC */}
      {canImportCSV && (
        <Button onClick={openImportDialog}>
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      )}
      
      {/* Bulk Upload - NOT available in BASIC */}
      {canBulkUpload ? (
        <Button onClick={openBulkUploadDialog}>
          <FileUp className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
      ) : (
        <UpgradeTrigger
          feature="Bulk Upload"
          requiredTier="STANDARD"
        >
          <Button disabled variant="outline">
            <Lock className="w-4 h-4 mr-2" />
            Bulk Upload (STANDARD+)
          </Button>
        </UpgradeTrigger>
      )}
    </div>
  );
}
```

---

### **Step 3: Block Settings & Members Routes**

```typescript
// src/app/dashboard/[slug]/settings/page.tsx
import { redirect } from 'next/navigation';
import { FeatureService } from '@/lib/features';
import { prisma } from '@/lib/db';

export default async function SettingsPage({ params }: Props) {
  const { slug } = await params;
  
  const festival = await prisma.festival.findUnique({
    where: { slug },
  });
  
  if (!festival) {
    redirect('/404');
  }
  
  // Check if settings feature is enabled for this tier
  if (!FeatureService.isFeatureEnabled(festival.tier, 'festivalSettings')) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=settings`);
  }
  
  // ... rest of settings page
}
```

```typescript
// src/app/dashboard/[slug]/members/page.tsx
export default async function MembersPage({ params }: Props) {
  const { slug } = await params;
  
  const festival = await prisma.festival.findUnique({
    where: { slug },
  });
  
  if (!festival) {
    redirect('/404');
  }
  
  // Check if members feature is enabled
  if (!FeatureService.isFeatureEnabled(festival.tier, 'members')) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=members`);
  }
  
  // ... rest of members page
}
```

---

### **Step 4: Simplified Public Landing Page for BASIC**

```typescript
// src/app/(public)/[slug]/page.tsx
import { FeatureService } from '@/lib/features';
import { prisma } from '@/lib/db';
import { BasicLandingPage } from '@/components/festival/landing/BasicLandingPage';
import { FullLandingPage } from '@/components/festival/landing/FullLandingPage';

export default async function FestivalPublicPage({ params }: Props) {
  const { slug } = await params;
  
  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: {
      // Include results for BASIC plan
      programmes: {
        include: {
          assignments: {
            include: {
              student: true,
              results: true,
            },
          },
        },
      },
    },
  });
  
  if (!festival) {
    return <div>Festival not found</div>;
  }
  
  // Check if full landing page is available
  const hasFullLandingPage = FeatureService.isFeatureEnabled(
    festival.tier,
    'fullLandingPage'
  );
  
  if (hasFullLandingPage) {
    return <FullLandingPage festival={festival} />;
  }
  
  // BASIC plan gets simplified landing page
  return <BasicLandingPage festival={festival} />;
}
```

```typescript
// src/components/festival/landing/BasicLandingPage.tsx
import { Card } from '@/components/ui/card';

interface BasicLandingPageProps {
  festival: any; // Type properly
}

export function BasicLandingPage({ festival }: BasicLandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Simple Hero Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold text-white mb-4">
            {festival.name}
          </h1>
          <p className="text-xl text-slate-300">
            {festival.description || 'Festival Results'}
          </p>
        </div>
      </section>
      
      {/* Results Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">
            Results
          </h2>
          
          {/* Display results */}
          <div className="space-y-6">
            {festival.programmes?.map((programme: any) => (
              <Card key={programme.id} className="p-6">
                <h3 className="text-xl font-bold mb-4">
                  {programme.name}
                </h3>
                
                {/* List results for this programme */}
                <div className="space-y-2">
                  {programme.assignments
                    ?.filter((a: any) => a.results?.length > 0)
                    ?.map((assignment: any, index: number) => (
                      <div key={assignment.id} className="flex justify-between py-2 border-b">
                        <span>
                          {index + 1}. {assignment.student?.name}
                        </span>
                        <span className="font-semibold">
                          {assignment.results[0]?.position || '-'}
                        </span>
                      </div>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Simple Footer */}
      <footer className="py-8 bg-slate-900 text-white text-center">
        <p className="text-sm">
          Powered by GreenRoom Festival Management
        </p>
      </footer>
    </div>
  );
}
```

---

### **Step 5: Hide Export Excel Button**

```typescript
// src/components/festival/pre-works/students/StudentsClient.tsx
export function StudentsClient() {
  const canExportPdf = useFeature('pdfExport');
  const canExportExcel = useFeature('excelExport');
  
  return (
    <div className="flex gap-2">
      {/* PDF Export - Available in BASIC */}
      {canExportPdf && (
        <Button onClick={handlePdfExport}>
          <FileText className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      )}
      
      {/* Excel Export - NOT available in BASIC */}
      {canExportExcel ? (
        <Button onClick={handleExcelExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      ) : (
        <UpgradeTrigger feature="Excel Export" requiredTier="STANDARD">
          <Button disabled variant="outline">
            <Lock className="w-4 h-4 mr-2" />
            Export Excel (STANDARD+)
          </Button>
        </UpgradeTrigger>
      )}
    </div>
  );
}
```

---

### **Step 6: Post-Expiry Data Deletion**

```typescript
// src/server/cron/cleanup-expired-festivals.ts
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/config/pricing';

export async function cleanupExpiredFestivals() {
  const now = new Date();
  
  // Find all expired festivals
  const expiredFestivals = await prisma.festival.findMany({
    where: {
      expiresAt: {
        lte: now,
      },
      status: 'ACTIVE', // Haven't been processed yet
    },
  });
  
  for (const festival of expiredFestivals) {
    const tierConfig = TIER_CONFIG[festival.tier];
    const postExpiryAccess = tierConfig.features.postExpiryAccess;
    
    if (postExpiryAccess === 'delete') {
      // BASIC plan - Delete all festival data
      console.log(`Deleting data for expired BASIC festival: ${festival.name}`);
      
      // Delete in correct order (due to foreign keys)
      await prisma.$transaction(async (tx) => {
        // Delete assignments first
        await tx.programmeAssignment.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Delete students
        await tx.student.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Delete programmes
        await tx.programme.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Delete categories
        await tx.category.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Delete groups
        await tx.group.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Delete stages
        await tx.stage.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Delete events
        await tx.event.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Delete members
        await tx.festivalMember.deleteMany({
          where: { festivalId: festival.id },
        });
        
        // Finally, delete the festival itself
        await tx.festival.delete({
          where: { id: festival.id },
        });
      });
      
      console.log(`✅ Deleted festival: ${festival.name}`);
      
    } else if (postExpiryAccess === 'readonly') {
      // STANDARD/PRO - Just mark as EXPIRED
      await prisma.festival.update({
        where: { id: festival.id },
        data: { status: 'EXPIRED' },
      });
      
      console.log(`✅ Marked festival as EXPIRED: ${festival.name}`);
    }
  }
}
```

```typescript
// src/app/api/cron/cleanup/route.ts
import { NextResponse } from 'next/server';
import { cleanupExpiredFestivals } from '@/server/cron/cleanup-expired-festivals';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await cleanupExpiredFestivals();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
```

---

### **Step 7: Hide QR Code Features**

```typescript
// src/components/festival/pre-works/students/StudentCard.tsx
export function StudentCard({ student }: Props) {
  const hasQrCodes = useFeature('qrCodes');
  
  return (
    <Card>
      <CardHeader>
        <h3>{student.name}</h3>
        <p>Chest No: {student.chestNumber}</p>
      </CardHeader>
      
      <CardFooter>
        {/* Show QR only if feature enabled */}
        {hasQrCodes ? (
          <Button onClick={() => generateQR(student.id)}>
            <QrCode className="w-4 h-4 mr-2" />
            View QR Code
          </Button>
        ) : (
          <UpgradeTrigger feature="QR Codes" requiredTier="STANDARD">
            <Button disabled variant="outline">
              <Lock className="w-4 h-4 mr-2" />
              QR Code (STANDARD+)
            </Button>
          </UpgradeTrigger>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## 📋 BASIC Plan UI/UX Checklist

### **Navigation (Sidebar)**
- [x] Show: Categories, Groups, Students, Programmes, Assignments
- [x] Show: Chest Numbers, Results
- [x] Hide: Stage Management, Schedule
- [x] Hide: Settings, Members

### **Student Management**
- [x] Show: Add Student (single)
- [x] Show: Import CSV
- [x] Hide: Bulk Upload
- [x] Show: PDF Export
- [x] Hide: Excel Export
- [x] Hide: QR Code generation

### **Programme Management**
- [x] Show: Add Programme (single)
- [x] Hide: Bulk Upload
- [x] Show: PDF Export
- [x] Hide: Excel Export

### **Public Landing Page**
- [x] Show: Simplified version (Title + Results only)
- [x] Hide: Full landing page builder
- [x] Hide: Custom sections
- [x] Hide: Gallery, News, Events sections

### **Post-Expiry**
- [x] Delete all festival data (no read-only access)
- [x] Immediate deletion on expiry

---

## 🚀 Deployment Checklist

### **Backend**
- [ ] Update `TIER_CONFIG` with BASIC features
- [ ] Create `FeatureService` class
- [ ] Add feature checks to all actions
- [ ] Implement post-expiry cleanup cron job
- [ ] Test data deletion on expiry

### **Frontend**
- [ ] Update sidebar navigation
- [ ] Hide bulk upload buttons
- [ ] Hide Excel export buttons
- [ ] Hide QR code features
- [ ] Block Settings route
- [ ] Block Members route
- [ ] Create BasicLandingPage component
- [ ] Add UpgradeTrigger for locked features

### **Testing**
- [ ] Test BASIC plan purchase
- [ ] Test all included features work
- [ ] Test all excluded features are hidden
- [ ] Test upgrade prompts display correctly
- [ ] Test data deletion on expiry
- [ ] Test limits enforcement

---

## 📝 User Journey: BASIC Plan

### **1. Registration & Purchase**
```
User registers → Selects BASIC plan (₹1,500) → Payment via Razorpay
→ Festival created (30-day access) → Redirect to dashboard
```

### **2. Festival Setup**
```
Create Categories → Create Groups → Import Students (CSV)
→ Create Programmes (one by one) → Assign students to programmes
```

### **3. Event Management**
```
Generate chest numbers → Enter results → View results
```

### **4. Public Viewing**
```
Share festival URL → Public sees basic page with title + results
```

### **5. Expiry (After 30 Days)**
```
Festival expires → Cron job deletes all data → User must purchase again for new festival
```

---

**This implementation provides a clear, restricted BASIC plan experience that encourages upgrades while still being functional for small festivals.**
