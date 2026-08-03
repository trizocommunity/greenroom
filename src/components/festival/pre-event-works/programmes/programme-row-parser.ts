export type ProgrammeType = "INDIVIDUAL" | "GROUP";
export type StageType = "STAGE" | "NON_STAGE";

export interface ParsedProgrammeData {
  name: string;
  categoryName: string;
  type: ProgrammeType | "";
  stageType: StageType;
  maxParticipantsPerGroup: number;
  maxTeamsPerGroup: number;
  maxParticipantsPerTeam: number;
  categoryId?: string;
}

export interface ParsedItem<T> {
  id: string;
  originalRowIndex: number;
  data: T;
  isValid: boolean;
  errors: string[];
}

const GROUP_VARIANTS = new Set(["GROUP", "group", "Group"]);
const INDIVIDUAL_VARIANTS = new Set([
  "INDIVIDUAL",
  "individual",
  "Individual",
]);
const STAGE_VARIANTS = new Set(["STAGE", "stage", "Stage"]);
const NON_STAGE_VARIANTS = new Set([
  "OFF-STAGE",
  "off-stage",
  "Off-Stage",
  "NON_STAGE",
  "NON-STAGE",
  "Non-Stage",
]);

export function normaliseProgrammeType(
  raw: unknown,
): { value: ProgrammeType | ""; error?: string } {
  const text = (raw ?? "").toString().trim();
  if (text === "") {
    return { value: "", error: "Type is required (GROUP or INDIVIDUAL)" };
  }
  if (GROUP_VARIANTS.has(text)) return { value: "GROUP" };
  if (INDIVIDUAL_VARIANTS.has(text)) return { value: "INDIVIDUAL" };
  return { value: "", error: `Invalid Type: ${text}` };
}

export function normaliseStageType(
  raw: unknown,
): { value: StageType; error?: string } {
  const text = (raw ?? "").toString().trim();
  if (text === "") return { value: "STAGE" };
  if (NON_STAGE_VARIANTS.has(text)) return { value: "NON_STAGE" };
  if (STAGE_VARIANTS.has(text)) return { value: "STAGE" };
  return { value: "STAGE", error: `Invalid Stage Type: ${text}` };
}

export function parseProgrammeRow(
  row: unknown[],
  index: number,
  categories: Array<{ id: string; name: string }>,
): ParsedItem<ParsedProgrammeData> {
  const name = (row?.[0] ?? "").toString().trim();
  const categoryName = (row?.[1] ?? "").toString().trim();
  const typeRaw = row?.[2];
  const stageTypeRaw = row?.[3];

  const errors: string[] = ["Set limits manually"];

  if (!name) errors.push("Name is required");
  if (!categoryName) errors.push("Category is required");

  const category = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
  );
  if (categoryName && !category) {
    errors.push(`Category '${categoryName}' not found`);
  }

  const typeResult = normaliseProgrammeType(typeRaw);
  if (typeResult.error) errors.push(typeResult.error);

  const stageResult = normaliseStageType(stageTypeRaw);
  if (stageResult.error) errors.push(stageResult.error);

  return {
    id: "",
    originalRowIndex: index,
    data: {
      name,
      categoryName,
      type: typeResult.value,
      stageType: stageResult.value,
      maxParticipantsPerGroup: 0,
      maxTeamsPerGroup: 0,
      maxParticipantsPerTeam: 0,
      categoryId: category?.id,
    },
    isValid: false,
    errors,
  };
}
