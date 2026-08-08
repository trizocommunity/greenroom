export type DurationMode = "SEQUENTIAL" | "PARALLEL";
export type ProgrammeType = "INDIVIDUAL" | "GROUP";

export interface DurationInput {
  type: ProgrammeType;
  durationMode: DurationMode;
  timePerUnitMinutes: number;
  parallelDurationMinutes: number | null;
  /** Number of individual assignments or group teams */
  unitCount: number;
}

export interface DurationResult {
  totalMinutes: number;
  label: string;
}

export function calculateProgrammeDuration(
  input: DurationInput,
): DurationResult {
  if (input.durationMode === "PARALLEL") {
    const total = input.parallelDurationMinutes ?? 60;
    return {
      totalMinutes: total,
      label: `${total}m (parallel)`,
    };
  }

  const perUnit = input.timePerUnitMinutes;
  const count = input.unitCount;
  const total = perUnit * count;
  const unitLabel = input.type === "GROUP" ? "groups" : "participants";

  return {
    totalMinutes: total,
    label: `${count} ${unitLabel}, ${count} × ${perUnit}m = ${total}m`,
  };
}

export function getEndTimeFromDuration(
  startTime: Date,
  totalMinutes: number,
): Date {
  return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
}
