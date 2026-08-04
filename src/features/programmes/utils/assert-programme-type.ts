import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

export type ProgrammeTypeValue = "INDIVIDUAL" | "GROUP";

export function assertProgrammeType(
  type: ProgrammeTypeValue | string | null | undefined,
): asserts type is ProgrammeTypeValue {
  if (type !== "INDIVIDUAL" && type !== "GROUP") {
    throw new AppError(ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN);
  }
}

export function requireProgrammeType(
  type: ProgrammeTypeValue | string | null | undefined,
  context?: string,
): ProgrammeTypeValue {
  if (type === "INDIVIDUAL" || type === "GROUP") return type;
  throw new AppError(
    context
      ? `${context}: ${ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN}`
      : ERROR_MESSAGES.PROGRAMME_TYPE_UNKNOWN,
  );
}

export function isProgrammeType(
  type: unknown,
): type is ProgrammeTypeValue {
  return type === "INDIVIDUAL" || type === "GROUP";
}
