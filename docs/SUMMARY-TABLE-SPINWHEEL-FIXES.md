# Summary Table & Spin Wheel Fixes

## Issues Reported:
1. **Summary table needs to show WHO reported** - Currently doesn't display `reportedBy` information
2. **Spin wheel not opening** - Button may not be showing or modal not rendering

---

## Root Causes:

### Issue 1: Missing `reportedBy` Data
The summary table doesn't fetch or display who reported each participant/team.

### Issue 2: Spin Wheel Conditions
The spin wheel button only shows when:
- Programme type is GROUP
- `reportingStats` is loaded
- `reportingStats.reported > 0`
- Session exists and is not locked

---

## What's Been Fixed:

### ✅ 1. Added `reportedBy` Data Fetching

**File**: `src/app/dashboard/[slug]/event-works/reporting/page.tsx`

Added query to fetch reported participants with `reportedBy` info:

```typescript
const reportedParticipants = await prisma.programmeReportedParticipant.findMany({
  where: {
    reportingSessionId: {
      in: board
        .map((b) => b.reportingSession?.id)
        .filter((id): id is string => Boolean(id)),
    },
  },
  select: {
    assignmentId: true,
    reportingSessionId: true,
    reportedBy: true,
    reportedAt: true,
  },
});
```

### ✅ 2. Updated Component Props

**File**: `src/components/festival/event-works/programme-reporting/ProgrammeReportingClient.tsx`

- Added `ReportedParticipantInfo` type
- Added `reportedParticipants` prop to component
- Added `reportedBy` field to `RosterTableRow` type

---

## What Still Needs to Be Done:

### Manual Fix Required:

The search_replace tool had issues with the complex memo logic. Here's what needs to be added manually:

#### Step 1: Add reportedByMap helper

After `assignmentsWithReported` useMemo (around line 365), add:

```typescript
// Create a map of assignmentId -> reportedBy for current session
const reportedByMap = useMemo(() => {
  const map = new Map<string, string | null>();
  if (!selected?.reportingSession?.id) return map;
  
  const sessionId = selected.reportingSession.id;
  for (const rp of reportedParticipants) {
    if (rp.reportingSessionId === sessionId) {
      map.set(rp.assignmentId, rp.reportedBy);
    }
  }
  return map;
}, [selected?.reportingSession?.id, reportedParticipants]);
```

#### Step 2: Update rosterTableRows to include reportedBy

In the `rosterTableRows` useMemo (around line 380), update both INDIVIDUAL and GROUP cases:

**For INDIVIDUAL (around line 385):**
```typescript
if (programme.type !== "GROUP") {
  return rows.map((a) => ({
    key: a.id,
    mode: "individual" as const,
    assignmentId: a.id,
    studentId: a.studentId,
    nameColumn: a.studentName ?? "—",
    groupName: a.groupName,
    teamCell: a.teamNumber ?? "—",
    isReported: a.isReported,
    reportedBy: reportedByMap.get(a.id), // ← ADD THIS
  }));
}
```

**For GROUP (around line 420):**
```typescript
// In the cluster map creation
const clusters = Array.from(teamMap.entries()).map(([key, members]) => {
  
  // Get reportedBy from first reported member
  const reportedBy = members.find(m => m.isReported) 
    ? reportedByMap.get(members[0].id) 
    : null;
  
  return {
    key: `team-${key}`,
    mode: "groupTeam" as const,
    assignmentIds: members.map((m) => m.id),
    studentIds: members.map((m) => m.studentId),
    nameColumn: members.map((m) => m.studentName).filter(Boolean).join(", ") || "—",
    groupName: members[0].groupName,
    teamCell: teamDisplay,
    isReported: teamIsReported,
    reportedBy, // ← ADD THIS
  };
});
```

#### Step 3: Display reportedBy in the table

In the table rendering (around line 1006), update to show who reported:

**Desktop table (around line 1006):**
```typescript
<div className="col-span-5 wrap-break-word pr-2">
  {row.nameColumn}
  {row.isReported && row.reportedBy && (
    <div className="text-xs text-muted-foreground mt-0.5">
      Reported by: {row.reportedBy}
    </div>
  )}
</div>
```

**Mobile cards (around line 1046):**
```typescript
<div className="min-w-0 flex-1">
  <div className="text-sm font-medium truncate">
    {title}
  </div>
  <div className="text-xs text-muted-foreground mt-0.5 truncate">
    {subtitle}
    {row.isReported && row.reportedBy && (
      <span className="ml-2 text-blue-600 dark:text-blue-400">
        · by {row.reportedBy}
      </span>
    )}
  </div>
</div>
```

---

## Testing the Spin Wheel:

### Check if Button Shows:

1. Select a GROUP programme
2. Start reporting
3. Mark at least one team as reported (scan their QR)
4. Button should appear: "🎰 Assign Codes (X teams)"

### If Button Doesn't Show:

Check browser console for:
- Is `reportingStats` loading? (check Network tab)
- Is `selected.programme?.type === "GROUP"` true?
- Is `reportingStats.reported > 0`?
- Is `session.isLocked` false?

### Temporary Debug Fix:

Add this before the button to debug:

```typescript
{console.log('Debug:', {
  isGroup: selected.programme?.type === "GROUP",
  hasStats: !!reportingStats,
  reported: reportingStats?.reported,
  hasSession: !!session,
  isLocked: session?.isLocked
})}
```

---

## Expected Result After Fix:

### Summary Table:

```
Team / members        | Group      | Code letter
----------------------|------------|------------
John, Jane, Bob       | Dance Grp  | —
Reported by: StageMgr |            |
```

### Mobile View:

```
┌─────────────────────────────────┐
│ Team 1                          │
│ Dance Group · by StageMgr       │
│                                 │
│ Reported              [Code A]  │
└─────────────────────────────────┘
```

---

## Priority:

1. ✅ Fetch `reportedBy` data (DONE)
2. ✅ Add types (DONE)
3. ⚠️ Update rosterTableRows (NEEDS MANUAL FIX)
4. ⚠️ Display in table (NEEDS MANUAL FIX)
5. ✅ Test spin wheel button (PENDING)

---

## Next Steps:

1. Apply the manual fixes above
2. Test summary table shows "Reported by: [name]"
3. Test spin wheel opens when clicking button
4. Verify both INDIVIDUAL and GROUP programmes work correctly
