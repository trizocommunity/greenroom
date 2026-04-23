# Programme Reporting - New Implementation Plan

## 📋 Requirements Analysis

### 1. **Clean & Simple UI**
- Simplify the live reporting component
- Reduce visual clutter
- Modern, intuitive interface

### 2. **Group Programme Reporting - Team-Based**
- **Current**: Each student in a group must be scanned individually
- **New**: Scan ANY student from a team = entire team reported
- Generate ONE code letter per team (not per student)
- Team-based logic: If student belongs to Team 1, scanning them reports all Team 1 members

### 3. **Code Letter Spinning Wheel**
- **New Flow**:
  1. Scan QR → Add to summary table (pending code assignment)
  2. Stage manager clicks "Assign Codes" → Opens spin wheel modal
  3. Wheel spins with available codes (A, B, C, D...)
  4. Manager taps/clicks to pause → Random code selected
  5. Preview the assigned code
  6. Confirm → Assigns code to student/team
  7. Triggers notifications & finalizes

### 4. **Flexible Reporting Time (NO Hard Limit)**
- **Current**: 5-minute hard limit (`REPORTING_WINDOW_MINUTES = 5`)
- **Problem**: Window expires and blocks further reporting - doesn't work for real events
- **New**: 
  - ❌ Remove forced timer that blocks reporting
  - ✅ Keep reporting open until manually closed
  - ✅ Calculate and DISPLAY estimated completion time
  - ✅ Show countdown as **informational only** (doesn't block)
  - ✅ Notify students/leaders of estimated end time

---

## ⏰ Flexible Time System - Detailed Design

### **Current Problem:**
```typescript
// Current code (lines 121-123 in service)
const windowEndsAt = new Date(
  now.getTime() + REPORTING_WINDOW_MINUTES * 60 * 1000 // 5 min hard limit
);

// Line 288-292: BLOCKS reporting after window ends
if (session.windowEndsAt && session.windowEndsAt.getTime() <= Date.now()) {
  throw new Error("Reporting window has ended. Restart reporting to continue marking.");
}
```

**This is problematic because:**
- Events run late
- Technical issues cause delays
- Large groups need more time
- Stage managers can't control event flow
- Frustrating user experience

### **New Approach:**

#### **1. Estimated Time Calculation**
```typescript
function calculateEstimatedReportingTime(
  totalParticipants: number,
  reportedParticipants: number,
  startTime: Date
): Date | null {
  if (reportedParticipants === 0) return null;
  
  const elapsed = Date.now() - startTime.getTime();
  const rate = elapsed / reportedParticipants; // ms per participant
  const remaining = totalParticipants - reportedParticipants;
  const estimatedEnd = new Date(Date.now() + (rate * remaining));
  
  return estimatedEnd;
}
```

**Example:**
```
Started at: 10:00 AM
Total teams: 10
Reported so far: 4 teams
Elapsed time: 8 minutes

Rate: 8 min / 4 teams = 2 min per team
Remaining: 6 teams
Estimated completion: 10:00 + (10 teams × 2 min) = 10:20 AM
Shows: "Estimated completion: 12 minutes"
```

#### **2. UI Display**
```
┌─────────────────────────────────────────┐
│ 📍 Main Stage                           │
│ 🎭 Dance Competition (GROUP)            │
│ ⏱️  Started 8 min ago                   │
│ 📊 Est. completion: ~12 min (10:20 AM) │
│                                         │
│ ✅ 4 of 10 teams reported               │
└─────────────────────────────────────────┘
```

#### **3. Smart Notifications**
```typescript
// Notify when reporting starts
"Reporting started for Dance Competition"
"Estimated time: 15-20 minutes"

// Update every 5 participants
"4 of 10 teams reported - ~12 min remaining"

// When all reported
"All teams reported! Ready to assign codes."
```

#### **4. Server Changes**

**Remove Hard Limit:**
```typescript
// In ProgrammeReportingService.start()
// OLD:
const windowEndsAt = new Date(now.getTime() + 5 * 60 * 1000);

// NEW:
const windowEndsAt = null; // No hard limit
// OR
const windowEndsAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour soft limit (informational only)
```

**Remove Blocking Check:**
```typescript
// In markParticipant() - REMOVE THIS:
if (session.windowEndsAt && session.windowEndsAt.getTime() <= Date.now()) {
  throw new Error("Reporting window has ended...");
}

// REPLACE WITH:
// No time check - reporting stays open until manually closed
```

**Add Estimated Time Endpoint:**
```typescript
export async function getReportingStatsAction(
  festivalId: string,
  reportingSessionId: string
) {
  const session = await prisma.programmeReportingSession.findUnique({
    where: { id: reportingSessionId },
    include: {
      programme: {
        include: {
          _count: { select: { assignments: true } }
        }
      },
      reportedParticipants: true
    }
  });

  const totalParticipants = session.programme._count.assignments;
  const reportedCount = session.reportedParticipants.length;
  const startTime = session.startedAt;
  
  let estimatedEnd = null;
  let estimatedRemaining = null;
  
  if (startTime && reportedCount > 0) {
    const elapsed = Date.now() - startTime.getTime();
    const rate = elapsed / reportedCount;
    const remaining = totalParticipants - reportedCount;
    estimatedRemaining = rate * remaining;
    estimatedEnd = new Date(Date.now() + estimatedRemaining);
  }
  
  return {
    total: totalParticipants,
    reported: reportedCount,
    remaining: totalParticipants - reportedCount,
    startedAt: startTime,
    elapsed: startTime ? Date.now() - startTime.getTime() : 0,
    estimatedEnd,
    estimatedRemainingMinutes: estimatedRemaining ? Math.ceil(estimatedRemaining / 60000) : null
  };
}
```

---

## 🎯 Implementation Strategy

### Phase 1: Simplify Reporting UI

#### Current Issues:
- Too many status badges
- Complex roster table
- Multiple action buttons
- Cluttered layout

#### New Design:
```
┌─────────────────────────────────────────────┐
│  📍 Main Stage                              │
│  🎭 Dance Competition (GROUP)               │
│  ⏱️  Started 8 min ago                      │
│  📊 Est. completion: ~12 min (10:20 AM)    │
│  ✅ 4 of 10 teams reported                  │
│                                             │
│  [▶ Start] [⏹ Stop] [🔄 Reset] [✓ Submit]  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 📷 QR Scanner                       │    │
│  │ [Camera View] or [Upload]           │    │
│  │                                     │    │
│  │ Last Scan: Team 3 - 3 members ✓    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Reported Teams (4)                  │    │
│  │ ┌────────────────────────────────┐  │    │
│  │ │ Team  │ Members   │ Code      │  │    │
│  │ ├────────────────────────────────┤  │    │
│  │ │ T1    │ 3 students│ ⏳ Pending │  │    │
│  │ │ T3    │ 3 students│ ⏳ Pending │  │    │
│  │ │ T2    │ 3 students│ ⏳ Pending │  │    │
│  │ │ T5    │ 3 students│ ⏳ Pending │  │    │
│  │ └────────────────────────────────┘  │    │
│  │                                     │    │
│  │ [🎰 Assign Codes via Spin Wheel]    │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Phase 2: Team-Based Group Reporting

#### Database Changes:
No schema changes needed! We already have:
- `teamNumber` on assignments
- `groupId` on assignments
- Code letters already group by team (lines 568-610 in service)

#### Logic Changes:

**Current Flow:**
```
Scan Student A (Team 1) → Mark Student A as reported
Scan Student B (Team 1) → Mark Student B as reported
Scan Student C (Team 1) → Mark Student C as reported
```

**New Flow:**
```
Scan Student A (Team 1) → Mark ALL Team 1 students as reported
                            → Add Team 1 to summary table
                            → Show: "Team 1 reported (3 members)"
```

**Implementation:**
```typescript
// In ProgrammeReportingService.markParticipant
if (isGroupProgramme && assignment.teamNumber) {
  // Find all assignments for this team
  const teamAssignments = await prisma.programmeAssignment.findMany({
    where: {
      programmeId: session.programmeId,
      groupId: assignment.groupId,
      teamNumber: assignment.teamNumber,
    },
  });
  
  // Mark all team members as reported
  for (const teamAssignment of teamAssignments) {
    await prisma.programmeReportedParticipant.upsert({
      where: {
        reportingSessionId_assignmentId: {
          reportingSessionId,
          assignmentId: teamAssignment.id,
        },
      },
      update: { reportedAt: new Date(), reportedBy: actorName },
      create: {
        reportingSessionId,
        assignmentId: teamAssignment.id,
        studentId: teamAssignment.studentId,
        groupId: assignment.groupId,
        teamNumber: assignment.teamNumber,
        reportedBy: actorName,
      },
    });
  }
  
  // Return team info for UI
  return {
    type: 'team',
    teamNumber: assignment.teamNumber,
    membersReported: teamAssignments.length,
  };
}
```

### Phase 3: Code Letter Spin Wheel

#### New Component: `CodeLetterSpinWheel.tsx`

**Features:**
- Modal component
- Animated spinning wheel
- Available codes displayed around wheel
- Tap/click to pause
- Preview assigned code
- Confirm assignment

**UI Design:**
```
┌──────────────────────────────────────┐
│     Assign Code Letters              │
│                                      │
│        ╭────────────╮               │
│      ╱    SPINNING   ╲              │
│     │    ┌─────┐      │             │
│     │    │  ⏸  │      │             │
│     │    └─────┘      │             │
│     │   A  B  C  D    │             │
│      ╲  E  F  G  H   ╱              │
│        ╰────────────╯               │
│                                      │
│  Tap wheel to pause & select code   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Selected: Code B            │   │
│  │  Assign to: Team 3 (3 teams) │   │
│  │                              │   │
│  │  [↩ Back]  [✓ Confirm]      │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

#### New Flow:

**Step 1: Scanning (No immediate code assignment)**
```typescript
// Scan QR → Add to pending list
const handleScanSuccess = (decodedData) => {
  const { studentId, chestNumber } = decodedData;
  
  // Find team info
  const assignment = assignments.find(a => a.studentId === studentId);
  const teamKey = `${assignment.groupId}-${assignment.teamNumber}`;
  
  // Add to pending if not already there
  if (!pendingTeams.has(teamKey)) {
    pendingTeams.add(teamKey);
    setPendingTeams([...pendingTeams, {
      teamNumber: assignment.teamNumber,
      groupName: assignment.groupName,
      members: getTeamMembers(assignment),
      status: 'pending_code'
    }]);
  }
};
```

**Step 2: Spin Wheel Modal**
```typescript
const handleOpenSpinWheel = () => {
  // Calculate available codes
  const totalTeams = pendingTeams.length;
  const availableCodes = generateCodes(totalTeams); // A, B, C, ...
  
  setSpinWheelOpen(true);
  setAvailableCodes(availableCodes);
  setSpinning(false);
  setSelectedCode(null);
};
```

**Step 3: Spin & Pause**
```typescript
const handleWheelTap = () => {
  if (!spinning) {
    // Start spinning
    setSpinning(true);
    setRotation(rotation + 360 * 5); // 5 full rotations
  } else {
    // Pause and select code
    setSpinning(false);
    const selectedCode = calculateSelectedCode(rotation);
    setSelectedCode(selectedCode);
  }
};
```

**Step 4: Confirm Assignment**
```typescript
const handleConfirmCodes = async () => {
  // Assign codes to all pending teams
  for (const team of pendingTeams) {
    await assignCodeToTeam({
      reportingSessionId,
      teamNumber: team.teamNumber,
      groupId: team.groupId,
      code: team.assignedCode,
      actorName,
    });
  }
  
  // Close modal
  setSpinWheelOpen(false);
  setPendingTeams([]);
};
```

#### Server Action for Code Assignment:
```typescript
// New action: assignCodeLetterWithSpin
export async function assignCodeLetterWithSpinAction(
  festivalId: string,
  reportingSessionId: string,
  assignments: {
    teamNumber: number;
    groupId: string;
    code: string;
  }[]
) {
  const actorName = await assertStageManagerAccess(festivalId);
  
  const result = await ProgrammeReportingService.assignCodesWithSpin(
    reportingSessionId,
    assignments,
    actorName
  );
  
  revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
  return { success: true, data: result };
}
```

---

## 🎨 UI/UX Improvements

### Simplified Component Structure:

```
ProgrammeReportingClient (Main)
├─ ReportingHeader (Stage, Programme, Timer)
├─ ReportingControls (Start, Stop, Reset, Submit)
├─ QrScanner (Camera + Upload)
├─ SummaryTable (Reported teams/students)
└─ CodeLetterSpinWheel (Modal)
   ├─ SpinningWheel (Animated)
   ├─ CodePreview
   └─ ConfirmationButtons
```

### Color Scheme:
- **Primary actions**: Green (Start, Confirm)
- **Warning actions**: Orange (Stop, Reset)
- **Danger actions**: Red (Close)
- **Neutral**: Blue (Scan, Assign)
- **Pending**: Yellow/Amber
- **Completed**: Green

---

## 📝 Implementation Steps

### Step 1: Update Service - Team-Based Reporting
**File**: `src/server/services/programme-reporting.service.ts`

**Changes**:
- Modify `markParticipant` to detect group programmes
- When scanning a student, find their team
- Mark all team members as reported
- Return team metadata

### Step 2: Create Spin Wheel Component
**File**: `src/components/festival/event-works/programme-reporting/CodeLetterSpinWheel.tsx`

**Features**:
- Framer Motion animations
- Circular wheel with codes
- Spin/pause functionality
- Code preview
- Confirmation flow

### Step 3: Simplify Reporting Client
**File**: `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

**Changes**:
- Remove complex roster table
- Add simple summary table
- Integrate spin wheel modal
- Improve scan feedback
- Clean up status badges

### Step 4: Create Server Action
**File**: `src/server/actions/programme-reporting.actions.ts`

**Add**:
- `assignCodeLetterWithSpinAction`
- Handles batch code assignment
- Triggers notifications
- Updates database

### Step 5: Update Service - Code Assignment
**File**: `src/server/services/programme-reporting.service.ts`

**Add**:
- `assignCodesWithSpin` method
- Creates code letters
- Assigns recipients
- Sends notifications
- Locks session

---

## 🔧 Technical Details

### Group Programme Detection:
```typescript
const isGroupProgramme = programme.type === "GROUP";
const hasTeams = assignments.some(a => a.teamNumber > 1);
```

### Team Bucket Logic (already exists):
```typescript
// Current code in service (lines 568-610) already handles this
// We just need to move it from close() to markParticipant()
```

### Code Generation:
```typescript
function sequentialAlphabetCode(ordinal: number): string {
  // A, B, C, ..., Z, AA, AB, ...
  let code = "";
  while (ordinal > 0) {
    ordinal -= 1;
    code = String.fromCharCode((ordinal % 26) + 65) + code;
    ordinal = Math.floor(ordinal / 26);
  }
  return code;
}
```

### Spin Wheel Math:
```typescript
const calculateSelectedCode = (rotation: number, codes: string[]) => {
  const normalizedRotation = rotation % 360;
  const segmentAngle = 360 / codes.length;
  const selectedIndex = Math.floor(normalizedRotation / segmentAngle);
  return codes[selectedIndex % codes.length];
};
```

---

## ⚠️ Safety Checks

1. **Prevent Duplicate Reporting**:
   - Check if team already reported before marking
   - Show toast if already scanned

2. **Code Assignment Validation**:
   - Ensure all reported teams get codes
   - Prevent duplicate codes
   - Validate before final submission

3. **Error Handling**:
   - Network errors during scan
   - Invalid QR codes
   - Already closed sessions

4. **Real-time Updates**:
   - Use existing Supabase subscriptions
   - Update UI immediately on scan
   - Sync across multiple devices

---

## 🎯 Benefits

### For Stage Managers:
✅ Faster scanning (1 scan per team vs N scans)
✅ Clear visual feedback
✅ Fun code assignment (spin wheel)
✅ Less errors
✅ Cleaner interface

### For Students:
✅ Faster reporting process
✅ Clear notifications
✅ Know their code immediately

### For System:
✅ No schema changes needed
✅ Backward compatible
✅ Cleaner code
✅ Better UX

---

## 📊 Timeline

**Total Estimated Time**: 6-8 hours

### Phase 0: Flexible Time System (1.5 hours)
- Remove hard time limit from service
- Create estimated time calculation function
- Add stats endpoint
- Update UI to show estimated time
- Test thoroughly

### Phase 1: Simplify UI (1 hour)
- Remove complex roster table
- Create simple summary table
- Update status badges
- Clean up action buttons
- Improve layout spacing

### Phase 2: Team-Based Reporting (1.5 hours)
- Update markParticipant service method
- Add team detection logic
- Mark all team members on single scan
- Update UI feedback messages
- Test with group programmes

### Phase 3: Spin Wheel Component (2 hours)
- Create CodeLetterSpinWheel component
- Add Framer Motion animations
- Implement spin/pause logic
- Add code preview
- Create confirmation flow
- Connect to server action

### Phase 4: Server Actions & Integration (1 hour)
- Create assignCodeLetterWithSpinAction
- Update close reporting flow
- Add notification triggers
- Handle edge cases

### Testing & Polish (1-1.5 hours)
- Test individual programmes (unchanged)
- Test group programmes (team scanning)
- Test spin wheel flow
- Test estimated time accuracy
- Test error scenarios
- Mobile responsiveness
- Performance optimization

---

## 🚀 Implementation Order

### Step 1: Remove Time Limit (Start Here) ✅
**Why first?** Critical fix, affects all reporting
**Files:**
- `src/server/services/programme-reporting.service.ts`
- `src/components/programme/ReportingEndsInCountdown.tsx`

**Changes:**
1. Remove `REPORTING_WINDOW_MINUTES` constant
2. Set `windowEndsAt = null` in start()
3. Remove time blocking checks in markParticipant()
4. Remove time blocking checks in markParticipantsBulk()
5. Create `calculateEstimatedTime()` function
6. Create `getReportingStatsAction()` server action
7. Update UI to show estimated time instead of countdown

### Step 2: Simplify UI
**Files:**
- `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

**Changes:**
1. Replace roster table with summary table
2. Simplify header section
3. Improve scan feedback
4. Clean up action buttons
5. Add progress indicator

### Step 3: Team-Based Group Reporting
**Files:**
- `src/server/services/programme-reporting.service.ts`
- `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

**Changes:**
1. Update markParticipant() for team detection
2. Mark all team members when one scanned
3. Return team metadata
4. Update UI to show team info
5. Prevent duplicate team scans

### Step 4: Create Spin Wheel
**Files:**
- `src/components/festival/event-works/programme-reporting/CodeLetterSpinWheel.tsx` (NEW)

**Features:**
1. Modal with overlay
2. Circular wheel with code segments
3. Framer Motion spin animation
4. Tap to pause
5. Selected code preview
6. Confirm/Back buttons

### Step 5: Connect Everything
**Files:**
- `src/server/actions/programme-reporting.actions.ts`
- `src/server/services/programme-reporting.service.ts`
- `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

**Changes:**
1. Create assignCodeLetterWithSpinAction
2. Add assignCodesWithSpin service method
3. Connect spin wheel to action
4. Handle success/error states
5. Update notifications

---

## 🔧 Technical Implementation Details

### File: `src/server/services/programme-reporting.service.ts`

#### Change 1: Remove Hard Time Limit
```typescript
// Line 8: Remove or comment out
// const REPORTING_WINDOW_MINUTES = 5;

// Line 121-123: Change from:
const windowEndsAt = new Date(
  now.getTime() + REPORTING_WINDOW_MINUTES * 60 * 1000,
);

// To:
const windowEndsAt = null; // No hard limit, manual close only
```

#### Change 2: Remove Blocking Checks
```typescript
// Lines 288-292: Remove this check
// if (session.windowEndsAt && session.windowEndsAt.getTime() <= Date.now()) {
//   throw new Error("Reporting window has ended...");
// }

// Lines 409-413: Remove this check too
// if (session.windowEndsAt && session.windowEndsAt.getTime() <= Date.now()) {
//   throw new Error("Reporting window has ended...");
// }
```

#### Change 3: Add Team-Based Reporting
```typescript
// In markParticipant() method, after line 324:

// Check if this is a group programme
if (session.programme.type === "GROUP" && assignment.teamNumber) {
  // Find all team assignments
  const teamAssignments = await prisma.programmeAssignment.findMany({
    where: {
      programmeId: session.programmeId,
      groupId: assignment.groupId,
      teamNumber: assignment.teamNumber,
    },
    select: {
      id: true,
      studentId: true,
    },
  });

  // Check if team already reported
  const existingReport = await prisma.programmeReportedParticipant.findFirst({
    where: {
      reportingSessionId,
      groupId: assignment.groupId,
      teamNumber: assignment.teamNumber,
    },
  });

  if (existingReport && isReported) {
    throw new Error(`Team ${assignment.teamNumber} has already been reported`);
  }

  // Mark all team members
  for (const teamAssignment of teamAssignments) {
    await prisma.programmeReportedParticipant.upsert({
      where: {
        reportingSessionId_assignmentId: {
          reportingSessionId,
          assignmentId: teamAssignment.id,
        },
      },
      update: {
        reportedAt: new Date(),
        reportedBy: actorName,
      },
      create: {
        reportingSessionId,
        assignmentId: teamAssignment.id,
        studentId: teamAssignment.studentId,
        groupId: assignment.groupId,
        teamNumber: assignment.teamNumber,
        reportedBy: actorName,
      },
    });
  }

  return {
    success: true,
    type: "team",
    teamNumber: assignment.teamNumber,
    membersCount: teamAssignments.length,
  };
}
```

#### Change 4: Add Estimated Time Calculation
```typescript
// Add new method to ProgrammeReportingService:

async getReportingStats(reportingSessionId: string) {
  const session = await prisma.programmeReportingSession.findUnique({
    where: { id: reportingSessionId },
    include: {
      programme: {
        include: {
          _count: { select: { assignments: true } },
        },
      },
      reportedParticipants: true,
    },
  });

  if (!session) throw new Error("Session not found");

  const totalParticipants = session.programme._count.assignments;
  const reportedCount = session.reportedParticipants.length;
  const remaining = totalParticipants - reportedCount;
  const startTime = session.startedAt;

  let estimatedEnd: Date | null = null;
  let estimatedRemainingMinutes: number | null = null;

  if (startTime && reportedCount > 0 && remaining > 0) {
    const elapsed = Date.now() - startTime.getTime();
    const rate = elapsed / reportedCount; // ms per participant
    const remainingMs = rate * remaining;
    estimatedRemainingMinutes = Math.ceil(remainingMs / 60000);
    estimatedEnd = new Date(Date.now() + remainingMs);
  }

  return {
    total: totalParticipants,
    reported: reportedCount,
    remaining,
    percentageComplete: Math.round((reportedCount / totalParticipants) * 100),
    startedAt: startTime,
    elapsedMinutes: startTime
      ? Math.round((Date.now() - startTime.getTime()) / 60000)
      : 0,
    estimatedEnd,
    estimatedRemainingMinutes,
  };
}
```

### File: `src/server/actions/programme-reporting.actions.ts`

#### Add New Action:
```typescript
export async function getReportingStatsAction(
  festivalId: string,
  reportingSessionId: string,
) {
  await assertStageManagerAccess(festivalId);
  
  const stats = await ProgrammeReportingService.getReportingStats(
    reportingSessionId,
  );
  
  return { success: true, data: stats };
}

export async function assignCodeLetterWithSpinAction(
  festivalId: string,
  reportingSessionId: string,
  codeAssignments: {
    teamNumber: number;
    groupId: string;
    code: string;
    studentIds: string[];
  }[],
) {
  const actorName = await assertStageManagerAccess(festivalId);
  
  const result = await ProgrammeReportingService.assignCodesWithSpin(
    reportingSessionId,
    codeAssignments,
    actorName,
  );
  
  const festival = await findFestivalById(festivalId);
  if (festival) {
    revalidatePath(`/dashboard/${festival.slug}/event-works/reporting`);
  }
  
  return { success: true, data: result };
}
```

### File: `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

#### Update UI to Show Estimated Time:
```typescript
// Add state for stats
const [reportingStats, setReportingStats] = useState<{
  total: number;
  reported: number;
  remaining: number;
  percentageComplete: number;
  elapsedMinutes: number;
  estimatedRemainingMinutes: number | null;
} | null>(null);

// Fetch stats every 30 seconds
useEffect(() => {
  if (sessionStatus !== "IN_PROGRESS") return;
  
  const fetchStats = async () => {
    const result = await getReportingStatsAction(
      festivalId,
      session.id,
    );
    if (result.success) {
      setReportingStats(result.data);
    }
  };
  
  fetchStats();
  const interval = setInterval(fetchStats, 30000);
  return () => clearInterval(interval);
}, [session?.id, sessionStatus]);

// In JSX:
{reportingStats && (
  <div className="space-y-2 text-sm">
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">Started {reportingStats.elapsedMinutes} min ago</span>
      <span className="font-medium">
        {reportingStats.reported} of {reportingStats.total} teams
      </span>
    </div>
    
    {reportingStats.estimatedRemainingMinutes && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>
          Est. completion: ~{reportingStats.estimatedRemainingMinutes} min 
          {reportingStats.estimatedEnd && (
            <> ({reportingStats.estimatedEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</>
          )}
        </span>
      </div>
    )}
    
    <div className="w-full bg-secondary rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all"
        style={{ width: `${reportingStats.percentageComplete}%` }}
      />
    </div>
  </div>
)}
```

---

## 🎨 Spin Wheel Component

### File: `src/components/festival/event-works/programme-reporting/CodeLetterSpinWheel.tsx`

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{
    teamNumber: number;
    members: number;
  }>;
  onConfirm: (assignments: Array<{
    teamNumber: number;
    code: string;
  }>) => void;
};

export function CodeLetterSpinWheel({
  open,
  onOpenChange,
  teams,
  onConfirm,
}: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  const codes = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const assignments: Array<{ teamNumber: number; code: string }> = [];

  const handleSpin = () => {
    if (!spinning) {
      setSpinning(true);
      setSelectedCode(null);
      setRotation((prev) => prev + 360 * 5 + Math.random() * 360);
    } else {
      setSpinning(false);
      // Calculate which code is selected based on rotation
      const normalizedRotation = rotation % 360;
      const segmentAngle = 360 / codes.length;
      const selectedIndex = Math.floor(normalizedRotation / segmentAngle);
      const code = codes[selectedIndex % codes.length];
      setSelectedCode(code);
    }
  };

  const handleConfirm = () => {
    if (selectedCode && currentTeamIndex < teams.length) {
      assignments.push({
        teamNumber: teams[currentTeamIndex].teamNumber,
        code: selectedCode,
      });

      if (currentTeamIndex + 1 >= teams.length) {
        // All teams assigned
        onConfirm(assignments);
        onOpenChange(false);
        setCurrentTeamIndex(0);
        setSelectedCode(null);
      } else {
        setCurrentTeamIndex((prev) => prev + 1);
        setSelectedCode(null);
        setRotation(0);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Code Letters</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="text-center text-sm text-muted-foreground">
            Team {currentTeamIndex + 1} of {teams.length}
          </div>

          {/* Wheel */}
          <div className="relative w-64 h-64 mx-auto">
            <motion.div
              className="w-full h-full rounded-full border-4 border-primary relative overflow-hidden"
              animate={{ rotate: rotation }}
              transition={{
                duration: spinning ? 3 : 0,
                ease: spinning ? "easeOut" : "easeInOut",
              }}
              onClick={handleSpin}
            >
              {/* Wheel segments */}
              {codes.map((code, index) => {
                const angle = (360 / codes.length) * index;
                return (
                  <div
                    key={code}
                    className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-30px)`,
                    }}
                  >
                    {code}
                  </div>
                );
              })}
            </motion.div>

            {/* Pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-primary" />
          </div>

          {/* Selected Code Preview */}
          {selectedCode && (
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                Selected Code
              </div>
              <div className="text-5xl font-bold text-primary">
                {selectedCode}
              </div>
              <div className="text-sm text-muted-foreground">
                For Team {teams[currentTeamIndex]?.teamNumber} (
                {teams[currentTeamIndex]?.members} members)
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-center text-xs text-muted-foreground">
            {spinning
              ? "Click wheel to pause and select code"
              : selectedCode
              ? "Click 'Confirm' to assign this code"
              : "Click wheel to start spinning"}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                setCurrentTeamIndex(0);
                setSelectedCode(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedCode}
              onClick={handleConfirm}
            >
              {currentTeamIndex + 1 >= teams.length
                ? "Assign All & Submit"
                : "Confirm & Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## ⚠️ Safety Checks & Edge Cases

### 1. **Prevent Duplicate Team Reporting**
```typescript
if (existingReport && isReported) {
  toast.info(`Team ${teamNumber} already reported`);
  return;
}
```

### 2. **Individual Programmes Unchanged**
```typescript
if (programme.type === "INDIVIDUAL") {
  // Keep existing logic - scan each student
}
```

### 3. **Network Errors**
```typescript
try {
  await markParticipantAction(...);
} catch (error) {
  toast.error("Failed to mark participant. Please try again.");
  console.error(error);
}
```

### 4. **Invalid QR Codes**
```typescript
if (!decodedData || !decodedData.studentId) {
  toast.error("Invalid QR code. Please try again.");
  return;
}
```

### 5. **Already Closed Session**
```typescript
if (sessionStatus === "CLOSED") {
  toast.error("Reporting is already closed");
  return;
}
```

### 6. **Code Assignment Validation**
```typescript
if (assignments.length !== teams.length) {
  toast.error("Not all teams have been assigned codes");
  return;
}
```

---

## 📱 Mobile Responsive Design

### Breakpoints:
- **Mobile (< 768px)**: Single column, full-width scanner
- **Tablet (768-1024px)**: Two columns, scanner + summary
- **Desktop (> 1024px)**: Three columns, scanner + summary + controls

### Touch-Friendly:
- Large tap targets (min 44px)
- Swipe gestures for wheel
- Haptic feedback on scan
- Easy-to-read text (min 16px)

---

## 🎯 Benefits

### For Stage Managers:
✅ **No time pressure** - Report at your own pace  
✅ **Faster scanning** - 1 scan per team vs N scans  
✅ **Clear visibility** - See estimated completion time  
✅ **Fun UX** - Spin wheel makes code assignment engaging  
✅ **Less errors** - Cleaner interface, better feedback  
✅ **Full control** - Close reporting when ready  

### For Students/Team Leaders:
✅ **Transparent timing** - Know when to expect completion  
✅ **Faster process** - Team-based reporting is quicker  
✅ **Clear notifications** - Updates on progress  
✅ **Know their code** - Immediate code assignment  

### For System:
✅ **No schema changes** - Existing tables support everything  
✅ **Backward compatible** - Won't break existing functionality  
✅ **Better UX** - Modern, clean interface  
✅ **Flexible** - Adapts to real event conditions  
✅ **Cleaner code** - Simplified logic  
✅ **Maintainable** - Well-structured, documented  

---

## 🚀 Deployment Checklist

- [ ] Remove time limit from service
- [ ] Add estimated time calculation
- [ ] Update UI with new stats display
- [ ] Test with individual programmes
- [ ] Test with group programmes (team scanning)
- [ ] Test spin wheel component
- [ ] Test error scenarios
- [ ] Mobile responsive testing
- [ ] Performance testing
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Update documentation

---

**Ready to implement!** 🎉
