# Results System Architecture

This document explains how the results system works, including the roles of different entities and how scoring and points calculation are handled.

## Core Entities

### 1. **Result** (`model Result`)
The central entity storing the performance outcome.
*   **`score` (Float)**: The raw input from the judge (e.g., `8.5`, `9.2`).
*   **`points` (Int)**: The calculated leaderboard value derived from the position (e.g., `10` for 1st, `7` for 2nd).
*   **`grade` (String)**: Assessment category based on `score` (e.g., `A`, `B+`).
*   **`position` (Int)**: Rank based on `score` comparison (e.g., `1`, `2`, `3`).
*   **`assignmentId`**: Links the result to a specific student/team in a programme.

### 2. **Programme** (`model Programme`)
Represents the competition item (e.g., "Elocution", "Group Song").
*   **`type`**: Determines if it's `INDIVIDUAL` or `GROUP`.
*   **`maxTeamsPerGroup`**: Constraints for participation.

### 3. **ProgrammeAssignment** (`model ProgrammeAssignment`)
The entry record for a participant.
*   Links a `Student` (or Team) to a `Programme`.
*   Assigned a `chestNumber` or `teamNumber`.
*   This is the entity that gets "graded".

### 4. **Group** (`model Group`)
Represents the "House" or "Team" (e.g., "Ruby House", "Emerald House").
*   Accumulates the `points` from all its members' results to determine the overall festival winner.

## Scoring Logic Workflow

1.  **Judge Input**:
    *   Judge enters a **Score** (0-10) for each participant.

2.  **System Calculation** (Automatic):
    *   **Grade**: Calculated from `score` (e.g., `Score >= 9` → `A+`).
    *   **Position**: Calculated by comparing `score` against all other participants in the same programme.
    *   **Points**: Assigned based on `position` (Standard logic: 1st=10, 2nd=7, 3rd=5).

3.  **Storage**:
    *   The system saves `score`, `grade`, `position`, and `points` to the `Result` record.

4.  **Leaderboard**:
    *   The Leaderboard queries the `Result` table, summing up `points` grouped by `Group` to show current standings.
