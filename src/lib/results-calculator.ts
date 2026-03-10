/**
 * Results Calculation Utilities
 *
 * Grade = (points / maxPoints) × 100; maxPoints is per-programme (highest points entered).
 * Position = rank by points (1-indexed).
 */

const DEFAULT_MAX_POINTS = 10;

/**
 * Calculate grade from the points (result) only.
 *
 * @param points - Points given, 0 to maxPoints
 * @param maxPoints - Maximum for this programme (default 10)
 */
export function calculateGrade(
  points: number,
  maxPoints: number = DEFAULT_MAX_POINTS,
): {
  grade: string;
  percentage: number;
  remarks: string;
} {
  if (maxPoints <= 0) {
    return {
      grade: "E",
      percentage: 0,
      remarks: "Needs Improvement",
    };
  }
  const rawPercentage = (points / maxPoints) * 100;
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
 * Calculate position (rank) based on points among all points.
 */
export function calculatePosition(
  points: number,
  allPoints: number[],
): number {
  const unique = Array.from(new Set(allPoints)).sort((a, b) => b - a);
  const position = unique.indexOf(points) + 1;
  return position > 0 ? position : 1;
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
