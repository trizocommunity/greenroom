export type SpinWheelEntry = {
  teamNumber: number;
  code: string;
};

export const SpinWheelService = {
  validateSpinAssignments(
    assignments: SpinWheelEntry[],
    availableTeams: Set<number>,
  ): { valid: boolean; missing: number[]; duplicates: number[] } {
    const seen = new Set<number>();
    const duplicates: number[] = [];
    const missing: number[] = [];

    for (const a of assignments) {
      if (seen.has(a.teamNumber)) duplicates.push(a.teamNumber);
      seen.add(a.teamNumber);
      if (!availableTeams.has(a.teamNumber)) missing.push(a.teamNumber);
    }

    return {
      valid: duplicates.length === 0 && missing.length === 0,
      duplicates,
      missing,
    };
  },

  shufflePairs<T extends SpinWheelEntry>(pairs: T[]): T[] {
    const result = [...pairs];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = result[i]!;
      result[i] = result[j]!;
      result[j] = tmp;
    }
    return result;
  },
};
