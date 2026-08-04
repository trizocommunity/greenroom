# Goal
Add default position points for 1st, 2nd, and 3rd place results. These points will be added to the grade-based award points to calculate the final `awardPoints` for a submission. This configuration should be editable per festival through the Scoring Policy screen.

## How the New Scoring Works
- **Grade Points:** The system calculates the participant's average score from the judges, finds the matching grade from the Scoring Policy (e.g., 85% = "A"), and assigns the corresponding matrix Grade Points.
- **Position Bonus:** If the participant placed 1st, 2nd, or 3rd among their competitors, the system adds the configured **Position Points** to their Grade Points. 
- **Final Award Points = Grade Points + Position Points**. These final points are what get credited to the participant's Team / Group Standings.
- **Below Threshold (No Grade):** If a participant scores below the minimum threshold (meaning they get `grade = null` and 0 Grade Points) but still places 1st, 2nd, or 3rd, they will **still receive the Position Points**.
- **Ties:** If two participants tie for 1st place, they will **both** receive the full 1st Place Points. The next highest scorer will receive 3rd place points.
- **Result Rosters:** The individual Result Rosters will continue to show the raw average score out of 100 and the prize (1st, 2nd, etc.). The final calculated `awardPoints` are kept "under the hood" and are only surfaced on the overarching Team Standings leaderboards.

## User Review Required
No breaking changes. Existing results in the database will retain their current points and will only be updated with position points if an administrator explicitly resaves or recomputes them.

## Open Questions
No open questions.

## Proposed Changes

---
### Database & Schema
#### [MODIFY] `src/core/database/schema.ts`
- Add `positionPoints1st`, `positionPoints2nd`, and `positionPoints3rd` as integer columns to the `festival_scoring_policy` table.
- Set defaults to 5, 3, and 1 respectively.

#### [NEW] Drizzle Migration
- Generate a drizzle migration (`npx drizzle-kit generate`) to add the new columns to the database.

---
### Services & Actions
#### [MODIFY] `src/features/judgement/services/scoring-policy.service.ts`
- Update `ScoringPolicyData` type to include the three new position points fields.
- Update `defaultScoringPolicyData()` to return the defaults (5, 3, 1).
- In `getScoringPolicyWithRules`, fetch the new position points from the database and map them.
- Update `upsertScoringPolicyActionData` to accept the new fields as input and save them during `INSERT` and `UPDATE` operations.
- Update `resolveScoringPolicy` return type to include these position points, so the caller can apply them during result calculation.

#### [MODIFY] `src/features/results/services/basic-scoring.service.ts`
- In `saveBasicProgrammeScores`, retrieve the position using `calculatePosition`.
- Calculate `finalAwardPoints` by taking the `awardPoints` from `resolveScoringPolicy` and adding the corresponding position points based on the rank (1st = `positionPoints1st`, 2nd = `positionPoints2nd`, etc.).
- Save this calculated `finalAwardPoints` to `ResultModel.upsert`.

#### [MODIFY] `src/features/judgement/actions/judgement.actions.ts`
- In `submitJudgeScoresAction` (and anywhere else results are upserted into `resultTable`), apply the exact same logic: compute position, add position points to grade points, and save the sum as `awardPoints`.
- Update `saveScoringPolicyAction` parameter types to pass the new position fields.

---
### UI & Client
#### [MODIFY] `src/components/dashboard/judgement/ScoringPolicyClient.tsx`
- Add a new section `PositionPointsSection` to the UI (near the `ScoringPolicySection`) to allow administrators to configure the 1st, 2nd, and 3rd place points.
- Manage state for `positionPoints1st`, `positionPoints2nd`, and `positionPoints3rd` (initialized from the `policy` prop).
- Include the new fields in `normalizeForComparison` to support the unsaved changes tracking/warnings properly.
- Update `onSave` payload to pass the three position points to the backend action.

## Verification Plan
### Manual Verification
- **Settings:** Go to the Scoring Policy screen and verify the new fields appear, are initialized with 5/3/1 defaults, and can be saved successfully.
- **Scoring Engine:** Use the Basic Scoring screen or Judgement Wizard to submit scores. Verify that a 1st place entry receives its normal matrix grade points **plus** the configured 1st place points. 
- **Ties:** Submit a tied score for 1st place. Verify both tied entries receive the correct position points, and the next entry receives 3rd place points.
- **Below Threshold:** Submit a winning score that is below the `noGradeBelow` threshold. Verify they receive the position points even without a grade.
