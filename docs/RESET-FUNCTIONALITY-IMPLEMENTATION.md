# Reset Functionality - Complete Implementation

## ✅ Implementation Status: COMPLETE

The Stop/Reset button now properly clears all programme reporting data and updates the programme status to RESET.

---

## 🎯 What Was Implemented

### **1. Added RESET Status to Programme** ✅

**File**: `prisma/schema.prisma`

Added `RESET` to the `ProgrammeStatus` enum:

```prisma
enum ProgrammeStatus {
  READY
  ASSIGNED
  SCHEDULED
  REPORTING
  STARTED
  ENDED
  JUDGED
  PUBLISHED
  RESET  // ← NEW
}
```

---

### **2. Enhanced Reset Function** ✅

**File**: `src/server/services/programme-reporting.service.ts`

The reset function now performs a **complete cleanup** in a database transaction:

#### **What Gets Cleared:**

1. ✅ **All Code Letter Recipients** - Links between codes and students
2. ✅ **All Code Letters** - Generated code letters for the session
3. ✅ **All Reported Participants** - All student/team reporting records
4. ✅ **Reporting Session** - Reset to clean state
5. ✅ **Programme Status** - Changed to RESET

#### **Code Implementation:**

```typescript
async reset(reportingSessionId: string, actorName: string) {
  // Clear all reporting data in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete all code letter recipients
    const codeLetters = await tx.programmeCodeLetter.findMany({
      where: { reportingSessionId },
      select: { id: true },
    });

    if (codeLetters.length > 0) {
      const codeLetterIds = codeLetters.map((cl) => cl.id);
      await tx.programmeCodeLetterRecipient.deleteMany({
        where: { codeLetterId: { in: codeLetterIds } },
      });
    }

    // 2. Delete all code letters
    await tx.programmeCodeLetter.deleteMany({
      where: { reportingSessionId },
    });

    // 3. Delete all reported participants
    await tx.programmeReportedParticipant.deleteMany({
      where: { reportingSessionId },
    });

    // 4. Reset the reporting session
    await tx.programmeReportingSession.update({
      where: { id: reportingSessionId },
      data: {
        status: "RESET",
        startedAt: null,
        startedBy: null,
        endedAt: new Date(),
        endedBy: actorName,
        windowEndsAt: null,
      },
    });

    // 5. Reset programme status
    await tx.programme.update({
      where: { id: session.programmeId },
      data: { status: "RESET" },
    });
  });

  // Send notifications...
}
```

---

### **3. Updated UI Components** ✅

#### **A. ProgrammeStatusBadge** ✅

**File**: `src/components/festival/ProgrammeStatusBadge.tsx`

Added RESET label and styling:

```typescript
const STATUS_LABELS: Record<ProgrammeStatus, string> = {
  // ... other statuses
  RESET: "Reset",  // ← NEW
};

const STATUS_STYLES: Record<ProgrammeStatus, string> = {
  // ... other styles
  RESET: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400 dark:bg-red-500/20",  // ← NEW
};
```

**Visual**: Red badge with "Reset" text

---

#### **B. ProgrammeReportingClient** ✅

**File**: `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

**Changes Made:**

1. **Added isReset state variable:**
```typescript
const isReset = sessionStatus === "RESET";
```

2. **Improved reset success message:**
```typescript
const onReset = () => {
  if (!session?.id) return;
  setActiveAction("reset");
  startTransition(async () => {
    const res = await resetProgrammeReportingAction(festivalId, session.id);
    if (res.success) {
      const message =
        res.data && typeof res.data === "object" && "message" in res.data
          ? (res.data as { message: string }).message
          : "Reporting reset successfully";
      toast.success(message);
    } else {
      toast.error("Failed to reset reporting");
    }
    setActiveAction(null);
  });
};
```

3. **Added RESET status message in UI:**
```typescript
{isReset ? (
  <p className="text-xs text-muted-foreground self-center">
    Programme has been reset. All reporting data cleared. Use
    Restart to start fresh reporting.
  </p>
) : null}
```

---

## 🔄 Complete Reset Flow

### **Before Reset:**
```
Programme: Dance Competition (GROUP)
Status: REPORTING or STARTED
Reported Participants: 6 (2 teams × 3 members)
Code Letters: 2 (A, B)
```

### **User Clicks "Stop / Reset" Button:**
```
1. Confirmation (optional - can add later)
   ↓
2. Reset function executes
   ↓
3. Database transaction starts
   ↓
4. Delete code letter recipients (6 records)
   ↓
5. Delete code letters (2 records)
   ↓
6. Delete reported participants (6 records)
   ↓
7. Reset reporting session
   - status: "RESET"
   - startedAt: null
   - startedBy: null
   ↓
8. Update programme status: "RESET"
   ↓
9. Transaction commits
   ↓
10. Send notifications to team leaders
    ↓
11. Emit realtime event
    ↓
12. Show success toast: "Reporting reset successfully. All team data cleared."
```

### **After Reset:**
```
Programme: Dance Competition (GROUP)
Status: RESET
Reported Participants: 0 ✅
Code Letters: 0 ✅
Reporting Session: Clean slate ✅

UI Shows:
- Badge: "Reset" (red)
- Message: "Programme has been reset. All reporting data cleared. Use Restart to start fresh reporting."
- Button: "Restart" (enabled)
- Table: Empty (no reported data)
```

---

## 📊 What Gets Cleared (Detailed)

### **Database Tables Affected:**

| Table | Before Reset | After Reset | Action |
|-------|-------------|-------------|--------|
| `ProgrammeReportedParticipant` | 6 records | 0 records | DELETE ALL |
| `ProgrammeCodeLetterRecipient` | 6 records | 0 records | DELETE ALL |
| `ProgrammeCodeLetter` | 2 records | 0 records | DELETE ALL |
| `ProgrammeReportingSession` | 1 record | 1 record | UPDATE (reset fields) |
| `Programme` | status: REPORTING | status: RESET | UPDATE status |

---

## 🎨 UI States After Reset

### **Status Badge:**
```
┌─────────────────┐
│  [Reset]  ← Red │
└─────────────────┘
```

### **Status Message:**
```
Programme has been reset. All reporting data cleared. 
Use Restart to start fresh reporting.
```

### **Action Buttons:**
```
[🔄 Restart]  ← Enabled, clickable
```

### **Roster Table:**
```
Team / members | Group | Code letter
---------------|-------|------------
(Empty - no data)
```

---

## 🔒 Safety Features

### **1. Transaction Safety:**
All deletions happen in a single database transaction:
- ✅ If any step fails → Everything rolls back
- ✅ No partial deletions
- ✅ Data integrity maintained

### **2. Access Control:**
- ✅ Only stage managers can reset
- ✅ Cannot reset if session is locked
- ✅ Validates session exists

### **3. Validation Checks:**
```typescript
if (!session) throw new Error("Reporting session not found");
if (session.isLocked) throw new Error("Reporting is locked");
```

### **4. Notifications:**
Sends notifications to:
- ✅ Team leaders (for the programme)
- ✅ All stakeholders (realtime + email)

### **5. Realtime Updates:**
Emits event to update all connected clients:
```typescript
await emitDomainRealtimeEvent({
  eventName: "reporting.updated",
  payload: {
    reportingSessionId,
    programmeId: session.programmeId,
    status: "RESET",
    cleared: true,
  },
});
```

---

## 📝 Notifications Sent

### **1. Programme Status Changed:**
```
Title: "Programme reset"
Body: "Programme has been reset. All reporting data cleared. Status: RESET"
Channels: IN_APP, REALTIME
```

### **2. Reporting Reset:**
```
Title: "Reporting reset"
Body: "All reporting data has been cleared. You can start fresh."
Channels: IN_APP, REALTIME, EMAIL
```

---

## 🎯 Use Cases

### **Use Case 1: Wrong Reporting Started**
```
Scenario: Stage manager accidentally started reporting for wrong programme

Solution:
1. Click "Stop / Reset"
2. All data cleared
3. Programme status → RESET
4. Can restart when ready
```

### **Use Case 2: Reset After Partial Reporting**
```
Scenario: Reported 2 out of 5 teams, but need to start over

Before Reset:
- Team 1: Reported, Code A
- Team 2: Reported, Code B
- Team 3-5: Not reported

After Reset:
- All teams: Not reported
- No codes assigned
- Clean slate to restart
```

### **Use Case 3: Fix Data Issues**
```
Scenario: Wrong students marked as reported

Solution:
1. Reset to clear all data
2. Start fresh
3. Scan correct students/teams
```

---

## ✅ Build Status

```
✓ Compiled successfully in 60s
✓ Finished TypeScript in 75s
✓ Collecting page data using 15 workers in 8.3s
✓ Generating static pages using 15 workers (44/44) in 5.0s
✓ Finalizing page optimization in 59.1ms
ZERO ERRORS!
```

---

## 📋 Files Modified

1. ✅ `prisma/schema.prisma` - Added RESET to ProgrammeStatus enum
2. ✅ `src/server/services/programme-reporting.service.ts` - Enhanced reset function
3. ✅ `src/components/festival/ProgrammeStatusBadge.tsx` - Added RESET label and style
4. ✅ `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx` - Updated UI

---

## 🚀 Next Steps (Optional Enhancements)

### **Future Improvements:**
1. **Confirmation Dialog**: Add "Are you sure?" modal before reset
2. **Reset Reason**: Optional text field to log why reset occurred
3. **Reset History**: Track who reset and when
4. **Soft Reset**: Option to keep some data (e.g., keep codes, clear only participants)
5. **Bulk Reset**: Reset multiple programmes at once

---

## 🎉 Summary

The reset functionality is now **production-ready** and:

- ✅ **Clears all reporting data** (participants, codes, recipients)
- ✅ **Updates programme status** to RESET
- ✅ **Shows clear UI feedback** (red badge, status message)
- ✅ **Sends notifications** to stakeholders
- ✅ **Maintains data integrity** (transaction safety)
- ✅ **Enables fresh restart** (can restart reporting from scratch)
- ✅ **Builds successfully** (zero errors)

**The Stop/Reset button now completely cleans the programme and prepares it for fresh reporting!** 🎊
