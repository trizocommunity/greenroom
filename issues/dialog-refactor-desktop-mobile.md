# Dialog Component Refactor — Drawer + ResponsiveDialog

## Status
- **Created**: 2026-07-22
- **Status**: Planning

## Summary

Refactor the dialog component system using the correct shadcn/ui approach:
- **Desktop form/detail dialogs** → `Drawer` (slides from right, full height, 500px min / 800px max)
- **Desktop alert/confirm dialogs** → `ResponsiveDialog` using `AlertDialog` (centered modal with destructive styling)
- **Mobile** → all dialogs become bottom sheets (via Drawer on mobile, ResponsiveDialog switches to drawer)

---

## Problem Statement

1. All dialogs currently appear as centered modals, even on desktop
2. Previous approach incorrectly tried to add `variant` prop to `Dialog` for side panels
3. No unified responsive strategy — mobile behavior is inconsistent across dialogs
4. `Sheet` component exists separately from `Dialog` but serves overlapping purposes
5. shadcn/ui provides `Drawer` and `ResponsiveDialog` patterns specifically for this use case

---

## Solution Overview

### shadcn/ui Pattern

| Component | Purpose | Desktop | Mobile |
|-----------|---------|---------|--------|
| **`Drawer`** | Form/detail side panels | Slides from right, full height, 500px min / 800px max | Bottom sheet (default Vaul behavior) |
| **`ResponsiveDialog`** | Alert/confirm dialogs | Centered `AlertDialog` modal | Bottom sheet (via Drawer) |
| **`Sheet`** | Deprecated | — | Use `Drawer direction="bottom"` for mobile nav |

### References
- [shadcn/ui Drawer](https://ui.shadcn.com/docs/components/radix/drawer)
- [shadcn/ui Responsive Dialog](https://ui.shadcn.com/docs/components/radix/drawer#responsive-dialog)

---

## Implementation Phases

### Phase 1: Foundation

#### 1.1 Install Drawer Component

```bash
npx shadcn@latest add drawer
```

This installs:
- `@vaul/drawer` — underlying library
- `src/components/ui/drawer.tsx` — base Drawer component

#### 1.2 Create `ResponsiveDialog` Component

Create `src/components/ui/responsive-dialog.tsx`:

```tsx
"use client";

import * as React from "react";
import { useIsMobile } from "@/components/common/use-mobile";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Sub-components needed:**
- `ResponsiveDialogTrigger`
- `ResponsiveDialogHeader` (maps to DrawerHeader / AlertDialogHeader)
- `ResponsiveDialogFooter` (maps to DrawerFooter / AlertDialogFooter)
- `ResponsiveDialogTitle` (maps to DrawerTitle / AlertDialogTitle)
- `ResponsiveDialogDescription` (maps to DrawerDescription / AlertDialogDescription)

#### 1.3 Revert `dialog.tsx` to Original

Restore `src/components/ui/dialog.tsx` to the original shadcn implementation.

**Revert all files that were modified with `variant="side"`:**
- Festival settings dialogs
- Student/assignment dialogs
- Category/group/programme dialogs
- Profile dialogs
- Admin dialogs
- Editor dialogs
- Dashboard member dialogs

#### 1.4 Make `alert-dialog.tsx` Responsive

Update `src/components/ui/alert-dialog.tsx`:
- **Desktop**: Centered modal (current behavior)
- **Mobile**: Bottom sheet (Drawer-based)

---

### Phase 2: Drawer Setup

#### 2.1 Configure Drawer for Desktop Side Panels

Update `src/components/ui/drawer.tsx` after shadcn install:

**Desktop side panel styling:**
```tsx
// For side panels (right by default)
const sideStyles = {
  right: "fixed right-0 top-0 h-full w-[500px] min-w-[500px] max-w-[800px] border-l",
  left: "fixed left-0 top-0 h-full w-[500px] min-w-[500px] max-w-[800px] border-r",
};

// For bottom sheets (mobile default)
const bottomStyles = "fixed bottom-0 inset-x-0 max-h-[85vh] rounded-t-xl";
```

**Add `direction` prop support:**
- `direction="right"` — side panel from right (default for form dialogs)
- `direction="left"` — side panel from left (for nav menus)
- `direction="bottom"` — bottom sheet (mobile default)

#### 2.2 Handle Sheet Component

**Option A: Keep Sheet for nav menus only**
- `Sheet` used only for mobile navigation menus (DashboardNavbar, StudentNavbar)
- These should use `Drawer direction="bottom"` instead

**Option B: Deprecate Sheet entirely**
- All Sheet usages migrate to `Drawer`
- Mobile nav menus use `Drawer direction="bottom"`
- Side panels use `Drawer direction="right"` or `direction="left"`

**Decision: Option B — Deprecate Sheet**

---

### Phase 3: Component Migration

#### 3.1 Form/Detail Dialogs → `Drawer`

Update the following to use `Drawer` instead of `Dialog`:

**Festival Settings Dialogs:**
- `src/components/festival/settings/dialogs/FestivalDetailsDialog.tsx`
- `src/components/festival/settings/dialogs/AdvancedSettingsDialog.tsx`
- `src/components/festival/settings/dialogs/DeadlinesDialog.tsx`
- `src/components/festival/settings/dialogs/TeamResultsDialog.tsx`
- `src/components/festival/settings/dialogs/VisualIdentityDialog.tsx`

**Student/Assignment Dialogs:**
- `src/components/festival/pre-event-works/students/StudentDialog.tsx`
- `src/components/festival/pre-event-works/students/StudentDetailsDialog.tsx`
- `src/components/festival/pre-event-works/students/BulkUploadStudentsModal.tsx`
- `src/components/festival/pre-event-works/students/AssignTeamLeadersModal.tsx`
- `src/components/festival/pre-event-works/assignments/AssignmentModal.tsx`
- `src/components/festival/pre-event-works/assignments/TeamStudentsDialog.tsx`
- `src/components/festival/pre-event-works/assignments/AssignmentsClient.tsx`

**Category/Group/Programme Dialogs:**
- `src/components/festival/pre-event-works/categories/CategoryDialog.tsx`
- `src/components/festival/pre-event-works/categories/CategoryDetailsDialog.tsx`
- `src/components/festival/pre-event-works/groups/GroupDialog.tsx`
- `src/components/festival/pre-event-works/groups/GroupDetailsDialog.tsx`
- `src/components/festival/pre-event-works/programmes/ProgrammeDialog.tsx`
- `src/components/festival/pre-event-works/programmes/BulkUploadProgrammesModal.tsx`

**Stage Dialogs:**
- `src/components/festival/event-works/stage-management/StageDialog.tsx`
- `src/components/festival/event-works/chest-numbers/ChestNumberSetup.tsx`

**Profile Dialogs:**
- `src/components/profile/UpdateProfileDialog.tsx`
- `src/components/profile/UpdateInstitutionDialog.tsx`
- `src/components/profile/EditProfileDialog.tsx`
- `src/components/profile/modals/PaymentDetailsModal.tsx`

**Admin Dialogs:**
- `src/components/admin/ViewDetailsDialog.tsx`

**Editor Dialogs:**
- `src/components/editor/NewTemplateModal.tsx`
- `src/components/editor/SaveTemplateModal.tsx`
- `src/components/editor/TeamCountModal.tsx`

**Dashboard Member Dialogs:**
- `src/app/dashboard/[slug]/members/_components/AddMemberDialog.tsx`
- `src/app/dashboard/[slug]/members/_components/MemberDetailsDialog.tsx`

**Other Dialogs:**
- `src/components/student/StudentQrDialogButton.tsx`
- `src/components/common/QrViewButton.tsx`

**Schedule Dialogs:**
- `src/components/festival/pre-event-works/schedule/ScheduleClient.tsx` (Add/Edit schedule)
- `src/components/festival/pre-event-works/schedule/SessionScheduleClient.tsx` (Add/Edit session)

**Judge Dialogs:**
- `src/components/festival/pre-event-works/judges/JudgesClient.tsx` (View activities/programmes)

**QR Codes Dialog:**
- `src/components/festival/pre-event-works/qr-codes/QrCodesClient.tsx`

#### 3.2 Alert/Confirm Dialogs → `ResponsiveDialog`

Update the following to use `ResponsiveDialog` with `AlertDialog` sub-components:

- `src/components/ui/delete-dialog.tsx`
- `src/components/admin/FreezeFestivalModal.tsx`
- `src/components/festival/posters/PublishPosterTemplateDialog.tsx`
- `src/components/festival/posters/PublishResultTemplateDialog.tsx`

#### 3.3 Mobile Navigation → Drawer

Update mobile nav menus to use `Drawer direction="bottom"`:

- `src/components/layout/DashboardNavbar.tsx`
- `src/components/student/StudentNavbar.tsx`
- `src/components/student/team-leader/AssignProgrammesClient.tsx`
- `src/components/ui/sidebar.tsx` (mobile sidebar)
- `src/components/festival/dashboard/DashboardRightSidebar.tsx`

---

## Component API Reference

### Drawer

```tsx
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

// Props
interface DrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  direction?: "top" | "right" | "bottom" | "left";
}

// Usage
<Drawer direction="right">
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Title</DrawerTitle>
      <DrawerDescription>Description</DrawerDescription>
    </DrawerHeader>
    {/* Content */}
    <DrawerFooter>
      <Button>Submit</Button>
      <DrawerClose>Cancel</DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

### ResponsiveDialog

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";

// Props
interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

// Desktop: AlertDialog centered modal
// Mobile: Drawer bottom sheet
```

### AlertDialog (desktop-only, for destructive confirmations)

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
```

---

## Implementation Order

### Phase 1: Foundation
1. `npm install @vaul/drawer` (via shadcn add drawer)
2. Create `src/components/ui/responsive-dialog.tsx`
3. Revert `src/components/ui/dialog.tsx` to original shadcn
4. Revert all files modified with `variant="side"`
5. Make `alert-dialog.tsx` responsive (desktop center, mobile bottom)

### Phase 2: Drawer Configuration
6. Configure `drawer.tsx` with desktop side panel constraints
7. Deprecate `sheet.tsx`, redirect to Drawer
8. Update mobile nav menus to use Drawer

### Phase 3: Component Migration
9. Migrate form/detail dialogs to Drawer (30+ files)
10. Migrate alert/confirm dialogs to ResponsiveDialog (4 files)

---

## Acceptance Criteria

- [ ] Drawer component installed and configured
- [ ] ResponsiveDialog component created and working
- [ ] Desktop: form/detail dialogs slide from right with 500px min / 800px max width
- [ ] Desktop: alert/confirm dialogs appear as centered AlertDialog modals
- [ ] Mobile: all dialogs appear as bottom sheets
- [ ] Sheet component deprecated
- [ ] Sticky header and footer on side panel drawers
- [ ] Smooth slide animations (right on desktop, bottom on mobile)
- [ ] Mobile navigation uses Drawer with bottom direction
- [ ] All 30+ existing dialog components updated
- [ ] No regression in existing functionality
- [ ] Lint passes
