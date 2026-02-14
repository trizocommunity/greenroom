/**
 * Results Calculation Utilities
 * Automatic grade and position calculation based on score
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

/**
 * Fixed maximum points for all programmes
 */
const MAX_POINTS = 10;

/**
 * Calculate grade based on points (out of 10)
 */
export function calculateGrade(points: number): {
  grade: string;
  percentage: number;
  remarks: string;
} {
  const percentage = (points / MAX_POINTS) * 100;

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
 * Calculate position (rank) based on points among all points
 */
export function calculatePosition(points: number, allPoints: number[]): number {
  // Sort points in descending order and find unique values
  const uniquePoints = Array.from(new Set(allPoints)).sort((a, b) => b - a);

  // Find the position (1-indexed)
  const position = uniquePoints.indexOf(points) + 1;

  return position > 0 ? position : 1; // Default to 1 if not found
}

/**
 * Validate points input (out of 10)
 */
export function validatePoints(points: number): {
  valid: boolean;
  error?: string;
} {
  if (points < 0) {
    return { valid: false, error: "Points cannot be negative" };
  }

  if (points > MAX_POINTS) {
    return {
      valid: false,
      error: `Points cannot exceed ${MAX_POINTS} points`,
    };
  }

  return { valid: true };
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  return points.toFixed(2);
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
