/**
 * Results Calculation Utilities
 *
 * Rule: Grade is derived only from the judge's score (result), on a scale 0 to maxScore.
 * Scoring system (POSITION_BASED vs SCORE_BASED) affects leaderboard points only, not grade.
 * Flow: result (score) → grade; result + position → points (for leaderboard).
 */

export interface PointsInput {
  points: number;
  maxPoints: number;
}

export interface CalculatedResult {
  grade: string;
  percentage: number;
  remarks: string;
}

/** Default maximum score (judge gives 0 to this value). */
const DEFAULT_MAX_SCORE = 10;

/**
 * Calculate grade from the judge's score (result) only.
 * Score is on scale 0 to maxScore (default 10). Grade is never based on position or leaderboard points.
 *
 * @param score - Judge's score (the result / points given), 0 to maxScore
 * @param maxScore - Maximum possible score (default 10)
 */
export function calculateGrade(
  score: number,
  maxScore: number = DEFAULT_MAX_SCORE,
): {
  grade: string;
  percentage: number;
  remarks: string;
} {
  if (maxScore <= 0) {
    return {
      grade: "E",
      percentage: 0,
      remarks: "Needs Improvement",
    };
  }
  const rawPercentage = (score / maxScore) * 100;
  const percentage = Math.min(100, Math.max(0, rawPercentage));

  let grade: string;
  let remarks: string;

  if (percentage >= 90) {
    grade = "A+";
    remarks = "Outstanding Performance";
  } else if (percentage >= 80) {
    grade = "A";
    remarks = "Excellent Performance";
  } else if (percentage >= 70) {
    grade = "B+";
    remarks = "Very Good Performance";
  } else if (percentage >= 60) {
    grade = "B";
    remarks = "Good Performance";
  } else if (percentage >= 50) {
    grade = "C+";
    remarks = "Above Average";
  } else if (percentage >= 40) {
    grade = "C";
    remarks = "Average Performance";
  } else if (percentage >= 30) {
    grade = "D";
    remarks = "Below Average";
  } else {
    grade = "E";
    remarks = "Needs Improvement";
  }

  return {
    grade,
    percentage,
    remarks,
  };
}

/**
 * Calculate position points based on rank
 * Higher ranks get more bonus points
 */
export function calculatePositionPoints(position: number): number {
  const pointsMap: Record<number, number> = {
    1: 10,
    2: 7,
    3: 5,
    4: 3,
    5: 2,
  };

  return pointsMap[position] || 0;
}

/**
 * Calculate leaderboard points based on scoring system.
 * This does not affect grade; grade is always from score only.
 *
 * @param scoringSystem - "POSITION_BASED" or "SCORE_BASED"
 * @param score - Judge's score (result)
 * @param position - Calculated rank (1, 2, 3...)
 */
export function calculatePoints(
  scoringSystem: "POSITION_BASED" | "SCORE_BASED",
  score: number,
  position: number,
): number {
  if (scoringSystem === "SCORE_BASED") {
    return Math.round(score);
  }
  return calculatePositionPoints(position);
}

/**
 * Calculate position (rank) based on score among all scores.
 * Uses the judge's scores (results), not leaderboard points.
 */
export function calculatePosition(
  score: number,
  allScores: number[],
): number {
  const uniqueScores = Array.from(new Set(allScores)).sort((a, b) => b - a);
  const position = uniqueScores.indexOf(score) + 1;
  return position > 0 ? position : 1;
}

/**
 * Validate score input (judge's result, 0 to maxScore).
 */
export function validatePoints(
  score: number,
  maxScore: number = DEFAULT_MAX_SCORE,
): {
  valid: boolean;
  error?: string;
} {
  if (score < 0) {
    return { valid: false, error: "Score cannot be negative" };
  }
  if (score > maxScore) {
    return {
      valid: false,
      error: `Score cannot exceed ${maxScore}`,
    };
  }
  return { valid: true };
}

/**
 * Format score for display
 */
export function formatPoints(score: number): string {
  return score.toFixed(2);
}

/**
 * Get grade color for UI display
 */
export function getGradeColor(grade: string): string {
  const colorMap: Record<string, string> = {
    "A+": "text-green-600 dark:text-green-400",
    A: "text-green-600 dark:text-green-400",
    "B+": "text-blue-600 dark:text-blue-400",
    B: "text-blue-600 dark:text-blue-400",
    "C+": "text-yellow-600 dark:text-yellow-400",
    C: "text-yellow-600 dark:text-yellow-400",
    D: "text-orange-600 dark:text-orange-400",
    E: "text-red-600 dark:text-red-400",
  };

  return colorMap[grade] || "text-gray-600 dark:text-gray-400";
}

/**
 * Get grade background color for badges
 */
export function getGradeBadgeColor(grade: string): string {
  const colorMap: Record<string, string> = {
    "A+": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    A: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    "B+": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    B: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    "C+": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    C: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    D: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    E: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  return (
    colorMap[grade] ||
    "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300"
  );
}
