/**
 * Results Calculation Utilities
 *
 * Grades and award points are resolved from the festival scoring policy
 * (see `src/features/judgement/services/scoring-policy.service.ts`).
 * This module only keeps rank calculation and presentation helpers.
 */

/**
 * Calculate position (rank) based on points among all points.
 */
export function calculatePosition(points: number, allPoints: number[]): number {
  const unique = Array.from(new Set(allPoints)).sort((a, b) => b - a);
  const position = unique.indexOf(points) + 1;
  return position > 0 ? position : 1;
}

/**
 * Get grade background color for badges.
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
