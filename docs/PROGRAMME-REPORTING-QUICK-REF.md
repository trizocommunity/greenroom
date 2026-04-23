# Programme Reporting - Quick Reference

## 🔄 Flow Comparison

### OLD FLOW (Current):
```
1. Start Reporting → 5 min timer starts
2. Scan Student A → Mark Student A ✓
3. Scan Student B → Mark Student B ✓
4. Scan Student C → Mark Student C ✓
5. ⏰ Timer expires → BLOCKED!
6. Must restart to continue
7. Close reporting → Auto-assign codes
8. Done
```

### NEW FLOW:
```
1. Start Reporting → No timer, shows estimate
2. Scan Student A (Team 1) → Mark ENTIRE Team 1 ✓
3. Scan Student D (Team 2) → Mark ENTIRE Team 2 ✓
4. See: "3 of 10 teams reported, ~14 min remaining"
5. Continue scanning at your pace
6. All reported → Click "Assign Codes"
7. Spin wheel → Select code → Confirm
8. Close reporting → Done!
```

---

## ⏰ Time System Changes

### Before:
```typescript
const REPORTING_WINDOW_MINUTES = 5; // HARD LIMIT
const windowEndsAt = new Date(now.getTime() + 5 * 60 * 1000);

// BLOCKS after 5 minutes
if (windowEndsAt.getTime() <= Date.now()) {
  throw new Error("Reporting window has ended!");
}
```

### After:
```typescript
const windowEndsAt = null; // NO HARD LIMIT

// Show estimate (informational only)
const estimatedTime = calculateEstimate(total, reported, startTime);
// "Started 8 min ago · Est. completion: ~12 min"

// No blocking - stage manager controls when to close
```

---

## 📊 UI Changes

### Before:
```
┌─────────────────────────────────────┐
│ Stage: Main                         │
│ Programme: Dance (GROUP)            │
│ ⏱️  Reporting Window: 3:42          │ ← STRESS!
│                                     │
│ [Start] [Stop] [Reset] [Submit]    │
│                                     │
│ Complex Roster Table:               │
│ ┌───┬──────┬───────┬────────┐     │
│ │ # │ Name │ Team  │ Status │     │
│ ├───┼──────┼───────┼────────┤     │
│ │ 1 │ John │ T1    │ ✓     │     │
│ │ 2 │ Jane │ T1    │ ✓     │     │
│ │ 3 │ Bob  │ T1    │ ✓     │     │
│ │ 4 │ ...  │ ...   │ ...   │     │
│ └───┴──────┴───────┴────────┘     │
│ (20+ rows, hard to read)          │
└─────────────────────────────────────┘
```

### After:
```
┌─────────────────────────────────────┐
│ 📍 Main Stage                       │
│ 🎭 Dance Competition (GROUP)        │
│ ⏱️  Started 8 min ago              │ ← RELAX!
│ 📊 Est. completion: ~12 min (10:20)│
│                                     │
│ ✅ 4 of 10 teams reported           │
│ ▓▓▓▓▓▓▓▓░░░░░░░░ 40%              │
│                                     │
│ [▶ Start] [⏹ Stop] [🔄 Reset]      │
│                                     │
│ 📷 QR Scanner                       │
│ Last: Team 3 (3 members) ✓         │
│                                     │
│ Reported Teams (4):                 │
│ ┌─────────────────────────────┐    │
│ │ T1 │ 3 students │ ⏳ Code   │    │
│ │ T2 │ 3 students │ ⏳ Code   │    │
│ │ T3 │ 3 students │ ⏳ Code   │    │
│ │ T5 │ 3 students │ ⏳ Code   │    │
│ └─────────────────────────────┘    │
│                                     │
│ [🎰 Assign Codes]                   │
└─────────────────────────────────────┘
```

---

## 🎯 Key Features

### 1. No Time Pressure
- ❌ Old: 5-minute countdown, then BLOCKED
- ✅ New: Report at your own pace
- Shows estimated completion time
- Stage manager decides when to close

### 2. Team-Based Scanning
- ❌ Old: Scan EACH student individually
- ✅ New: Scan ONE student = whole team reported
- 3x faster for group programmes
- Clear feedback: "Team 3 (3 members) ✓"

### 3. Code Spin Wheel
- ❌ Old: Auto-assigned on close (boring)
- ✅ New: Spin wheel to select codes (fun!)
- Tap to pause, preview, confirm
- Engaging UX for stage managers

### 4. Clean Interface
- ❌ Old: Complex table with 20+ rows
- ✅ New: Simple summary by team
- Progress bar
- Clear action buttons

---

## 📈 Performance Impact

### Scanning Speed:
```
OLD: 10 teams × 3 members = 30 scans
NEW: 10 teams × 1 scan = 10 scans

Result: 67% faster! 🚀
```

### Time Management:
```
OLD: 5 minutes → BLOCKED → Restart
NEW: 15 minutes → No pressure → Close when ready

Result: Better experience, fewer errors! ✨
```

---

## 🔧 Implementation Phases

### Phase 0: Remove Time Limit (1.5h)
1. Remove `REPORTING_WINDOW_MINUTES`
2. Set `windowEndsAt = null`
3. Remove blocking checks
4. Add estimated time calculation
5. Update UI

### Phase 1: Simplify UI (1h)
1. Remove complex roster table
2. Add summary table
3. Improve layout
4. Add progress bar

### Phase 2: Team Reporting (1.5h)
1. Update markParticipant()
2. Add team detection
3. Mark all team members
4. Update UI feedback

### Phase 3: Spin Wheel (2h)
1. Create component
2. Add animations
3. Spin/pause logic
4. Connect to server

### Phase 4: Integration (1h)
1. Server actions
2. Error handling
3. Notifications
4. Testing

**Total: 7 hours**

---

## ✅ Success Metrics

- [ ] Stage managers can report without time pressure
- [ ] Team scanning works (1 scan = whole team)
- [ ] Estimated time is accurate (±2 min)
- [ ] Spin wheel is fun and functional
- [ ] UI is clean and intuitive
- [ ] No errors in production
- [ ] Mobile responsive
- [ ] Backward compatible (individual programmes unchanged)

---

## 🎨 Color Palette

```
Primary (Actions):     #10b981 (green)
Warning (Estimates):   #f59e0b (amber)
Info (Progress):       #3b82f6 (blue)
Success (Complete):    #22c55e (green)
Pending (Waiting):     #eab308 (yellow)
Danger (Close):        #ef4444 (red)
Neutral (Text):        #6b7280 (gray)
```

---

## 📱 Responsive Breakpoints

```
Mobile:    < 768px  (single column)
Tablet:    768-1024px (two columns)
Desktop:   > 1024px (three columns)
```

---

**Let's build this!** 🚀
