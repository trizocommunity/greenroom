# Fix DatePicker for Festival Start/End Dates

## Context

Festival start and end date selection is poor UX - using two separate single-date pickers instead of a proper range picker. User can't visually see the selected date range.

## Current State

### Components Using DatePicker for Festival Dates

| File | Usage |
|------|-------|
| `src/components/festival-setup/FestivalSetupForm.tsx` | Two separate DatePickers for start/end (lines 505, 541) |
| `src/components/festival/settings/dialogs/FestivalDetailsDialog.tsx` | Two separate DatePickers for start/end (lines 59-68) |
| `src/components/festival/settings/dialogs/DeadlinesDialog.tsx` | DateTimePicker for deadlines |

### DatePicker Limitations

- `mode="single"` - only selects one date, not a range
- `calendar.tsx` already has range CSS classes but they're not used
- react-day-picker supports `mode="range"` but DatePicker doesn't expose it
- No visual feedback showing selected range on calendar

## Implementation Plan

### Step 1: Create DateRangePicker component
- [ ] Create `src/components/ui/date-range-picker.tsx`
- [ ] Use react-day-picker's `mode="range"`
- [ ] Display selected range visually (highlight start→end)
- [ ] Support `from`/`to` props for valid range
- [ ] Add `showValidityHint` like DatePicker

### Step 2: Update FestivalSetupForm to use DateRangePicker
- [ ] Replace two DatePickers with single DateRangePicker
- [ ] Remove manual end-date adjustment logic (lines 516-523)
- [ ] Update form schema if needed

### Step 3: Update FestivalDetailsDialog to use DateRangePicker
- [ ] Same replacement for start/end date fields

### Step 4: Update DateTimePicker consistency (optional)
- [ ] Add `showValidityHint` support to DateTimePicker

## New Files

| File | Purpose |
|------|---------|
| `src/components/ui/date-range-picker.tsx` | New range picker component |

## Modified Files

| File | Change |
|------|--------|
| `src/components/festival-setup/FestivalSetupForm.tsx` | Use DateRangePicker |
| `src/components/festival/settings/dialogs/FestivalDetailsDialog.tsx` | Use DateRangePicker |

## Reference Files

- `src/components/ui/date-picker.tsx` - Existing DatePicker to reference style
- `src/components/ui/calendar.tsx` - Has range CSS classes already
- `src/components/ui/date-time-picker.tsx` - For consistency

## Effort

Medium - New component + 2 file updates. Straightforward react-day-picker range mode.
