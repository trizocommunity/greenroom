"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveScoringPolicyAction } from "@/features/judgment/actions/judgment.actions";

type GradeRule = { grade: string; min: number; max: number };
type AwardRule = {
  criteriaType: "PARTICIPANT_RANGE" | "PROGRAMME_SET";
  rowLabel?: string | null;
  programmeIds?: string[] | null;
  categoryId?: string | null;
  minParticipants: number;
  maxParticipants?: number | null;
  grade: string;
  awardPoints: number;
  priority?: number;
};

type MatrixRow = {
  rowLabel: string;
  criteriaType: "PARTICIPANT_RANGE" | "PROGRAMME_SET";
  programmeIds: string[];
  categoryId: string | null;
  minParticipants: number;
  maxParticipants: number | null;
  pointsByGrade: Record<string, number>;
};

function parseParticipantRangeFromLabel(label: string): {
  minParticipants: number;
  maxParticipants: number | null;
} {
  const raw = label.trim();
  if (!raw) return { minParticipants: 1, maxParticipants: 1 };

  const normalized = raw.replace(/\s/g, "").replace(",", "-");
  const rangeMatch = normalized.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
      return { minParticipants: min, maxParticipants: max };
    }
  }

  const singleMatch = normalized.match(/^(\d+)$/);
  if (singleMatch) {
    const value = Number(singleMatch[1]);
    if (Number.isFinite(value) && value > 0) {
      return { minParticipants: value, maxParticipants: value };
    }
  }

  return { minParticipants: 1, maxParticipants: 1 };
}

function ensurePointsShape(rows: MatrixRow[], grades: string[]): MatrixRow[] {
  return rows.map((row) => {
    const nextPoints: Record<string, number> = {};
    for (const grade of grades) {
      nextPoints[grade] = row.pointsByGrade[grade] ?? 0;
    }
    return { ...row, pointsByGrade: nextPoints };
  });
}

function normalizeForComparison(input: {
  noGradeBelow: number;
  gradeRules: GradeRule[];
  matrixRows: MatrixRow[];
}) {
  const normalizedGrades = input.gradeRules
    .map((r) => ({
      grade: r.grade.trim().toUpperCase(),
      min: Number(r.min),
      max: Number(r.max),
    }))
    .sort((a, b) => a.grade.localeCompare(b.grade));

  const gradeLabels = normalizedGrades.map((g) => g.grade);
  const rows = ensurePointsShape(input.matrixRows, gradeLabels).map((row) => ({
    ...(() => {
      if (row.criteriaType !== "PARTICIPANT_RANGE") {
        return {
          minParticipants: Number(row.minParticipants),
          maxParticipants:
            row.maxParticipants === null ? null : Number(row.maxParticipants),
        };
      }
      const parsed = parseParticipantRangeFromLabel(row.rowLabel);
      return {
        minParticipants: parsed.minParticipants,
        maxParticipants: parsed.maxParticipants,
      };
    })(),
    rowLabel: row.rowLabel?.trim() || "",
    criteriaType: row.criteriaType,
    programmeIds: [...row.programmeIds].sort(),
    categoryId: row.categoryId ?? null,
    pointsByGrade: gradeLabels.reduce(
      (acc, grade) => {
        acc[grade] = Number(row.pointsByGrade[grade] ?? 0);
        return acc;
      },
      {} as Record<string, number>,
    ),
  }));

  return {
    noGradeBelow: Number(input.noGradeBelow),
    gradeRules: normalizedGrades,
    matrixRows: rows,
  };
}

function ScoringPolicySection(props: {
  policyVersion: number;
  normalizeTo: number;
  isPersisted: boolean;
  noGradeBelow: number;
  setNoGradeBelow: (value: number) => void;
}) {
  const {
    policyVersion,
    normalizeTo,
    isPersisted,
    noGradeBelow,
    setNoGradeBelow,
  } = props;
  return (
    <Card>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Scoring Policy</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="h-5 px-2 text-[10px]">
              /{normalizeTo}
            </Badge>
            <Badge variant="outline" className="h-5 px-2 text-[10px]">
              v{policyVersion}
            </Badge>
            {!isPersisted && (
              <Badge className="h-5 px-2 text-[10px]">Default</Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Keep this compact and strict: values below threshold will not receive
          grade.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="no-grade-below" className="text-xs font-medium">
              No grade below (%)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Suggested default: 50
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="no-grade-below"
              type="number"
              min={0}
              max={100}
              value={noGradeBelow}
              onChange={(e) => setNoGradeBelow(Number(e.target.value))}
              className="h-8 w-full sm:w-24"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GradeRulesSection(props: {
  gradeRules: GradeRule[];
  onAddGrade: () => void;
  onUpdateGradeRule: (idx: number, patch: Partial<GradeRule>) => void;
  onRemoveGradeRule: (idx: number) => void;
}) {
  const { gradeRules, onAddGrade, onUpdateGradeRule, onRemoveGradeRule } =
    props;
  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg">Grade Rules</CardTitle>
            <p className="text-xs text-muted-foreground">
              Matrix columns are generated from these grade labels.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddGrade}
            className="h-8 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add grade
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_84px_84px_40px] items-center gap-2 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Grade</span>
            <span className="text-center">Min</span>
            <span className="text-center">Max</span>
            <span className="sr-only">Remove</span>
          </div>
          <div className="divide-y">
            {gradeRules.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Add a grade band to begin.
              </div>
            ) : (
              gradeRules.map((row, idx) => (
                <div
                  key={`${idx}-${row.grade}`}
                  className="grid grid-cols-[1fr_84px_84px_40px] items-center gap-2 px-3 py-2"
                >
                  <Input
                    placeholder="A+"
                    value={row.grade}
                    onChange={(e) =>
                      onUpdateGradeRule(idx, { grade: e.target.value })
                    }
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={row.min}
                    onChange={(e) =>
                      onUpdateGradeRule(idx, { min: Number(e.target.value) })
                    }
                    className="h-9 text-center font-mono"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={row.max}
                    onChange={(e) =>
                      onUpdateGradeRule(idx, { max: Number(e.target.value) })
                    }
                    className="h-9 text-center font-mono"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveGradeRule(idx)}
                    aria-label="Remove grade"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: keep the list short (e.g. A+, A, B, C) for faster scoring.
        </p>
      </CardContent>
    </Card>
  );
}

export function ScoringPolicyClient({
  festivalId,
  policy,
  categories,
  programmes,
}: {
  festivalId: string;
  policy: {
    policyVersion: number;
    normalizeTo: number;
    noGradeBelow: number;
    gradeRules: GradeRule[];
    awardRules: AwardRule[];
    isPersisted: boolean;
  };
  categories: Array<{ id: string; name: string }>;
  programmes: Array<{ id: string; name: string; categoryId: string | null }>;
}) {
  const dirtySourceId = `scoring-policy:${festivalId}`;
  const {
    registerDirtySource,
    unregisterDirtySource,
    setDirty,
    registerSaveHandler,
    unregisterSaveHandler,
  } = useUnsavedChanges();
  const programmeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of programmes) m.set(p.id, p.name);
    return m;
  }, [programmes]);

  const [isPending, startTransition] = useTransition();
  const [noGradeBelow, setNoGradeBelow] = useState<number>(policy.noGradeBelow);
  const [gradeRules, setGradeRules] = useState<GradeRule[]>(policy.gradeRules);
  const [addGradeOpen, setAddGradeOpen] = useState(false);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [addProgrammeOpen, setAddProgrammeOpen] = useState(false);
  const [newGrade, setNewGrade] = useState<GradeRule>({
    grade: "",
    min: 0,
    max: 0,
  });
  const [newParticipantRow, setNewParticipantRow] = useState({
    rowLabel: "",
  });
  const [newProgrammeRow, setNewProgrammeRow] = useState({
    programmeIds: [] as string[],
    categoryId: null as string | null,
  });
  const [matrixRows, setMatrixRows] = useState<MatrixRow[]>(() => {
    const grouped = new Map<string, MatrixRow>();
    for (const rule of policy.awardRules) {
      const key = [
        rule.criteriaType ?? "PARTICIPANT_RANGE",
        rule.rowLabel ?? "",
        (rule.programmeIds ?? []).sort().join(","),
        rule.categoryId ?? "",
        rule.minParticipants,
        rule.maxParticipants ?? "",
      ].join("|");
      const existing = grouped.get(key);
      if (existing) {
        existing.pointsByGrade[rule.grade.toUpperCase()] = rule.awardPoints;
        continue;
      }
      grouped.set(key, {
        rowLabel:
          rule.rowLabel ??
          (rule.criteriaType === "PROGRAMME_SET"
            ? "Programme row"
            : rule.maxParticipants &&
                rule.maxParticipants !== rule.minParticipants
              ? `${rule.minParticipants}-${rule.maxParticipants}`
              : String(rule.minParticipants)),
        criteriaType: rule.criteriaType ?? "PARTICIPANT_RANGE",
        programmeIds: rule.programmeIds ?? [],
        categoryId: rule.categoryId ?? null,
        minParticipants: rule.minParticipants,
        maxParticipants: rule.maxParticipants ?? null,
        pointsByGrade: { [rule.grade.toUpperCase()]: rule.awardPoints },
      });
    }
    return grouped.size > 0
      ? Array.from(grouped.values())
      : [
          {
            rowLabel: "1",
            criteriaType: "PARTICIPANT_RANGE",
            programmeIds: [],
            categoryId: null,
            minParticipants: 1,
            maxParticipants: 1,
            pointsByGrade: {},
          },
        ];
  });

  const availableGrades = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          gradeRules.map((r) => r.grade.trim().toUpperCase()).filter(Boolean),
        ),
      ),
    [gradeRules],
  );

  const updateGradeRule = (idx: number, patch: Partial<GradeRule>) => {
    setGradeRules((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  };

  const updateMatrixRow = (idx: number, patch: Partial<MatrixRow>) => {
    setMatrixRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  };

  const updateMatrixGradePoint = (
    idx: number,
    grade: string,
    value: number,
  ) => {
    setMatrixRows((prev) =>
      prev.map((row, i) =>
        i === idx
          ? { ...row, pointsByGrade: { ...row.pointsByGrade, [grade]: value } }
          : row,
      ),
    );
  };

  const toggleInList = (list: string[], value: string) => {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  };

  const rowCriteriaSummary = (row: MatrixRow) => {
    if (row.criteriaType === "PROGRAMME_SET") {
      if (row.programmeIds.length === 0) return "No programmes selected";
      return `${row.programmeIds.length} programme(s) selected`;
    }
    const parsed = parseParticipantRangeFromLabel(row.rowLabel);
    if (
      parsed.maxParticipants &&
      parsed.maxParticipants !== parsed.minParticipants
    ) {
      return `${parsed.minParticipants}-${parsed.maxParticipants} students`;
    }
    return `${parsed.minParticipants} student(s)`;
  };

  const getProgrammesByCategory = (categoryId: string | null) => {
    if (!categoryId)
      return [] as Array<{
        id: string;
        name: string;
        categoryId: string | null;
      }>;
    return programmes.filter((p) => p.categoryId === categoryId);
  };

  const addGradeFromDialog = () => {
    const label = newGrade.grade.trim().toUpperCase();
    if (!label) {
      toast.error("Grade label is required.");
      return;
    }
    if (newGrade.min > newGrade.max) {
      toast.error("Grade min must be less than or equal to max.");
      return;
    }
    setGradeRules((prev) => [
      ...prev,
      { grade: label, min: newGrade.min, max: newGrade.max },
    ]);
    setNewGrade({ grade: "", min: 0, max: 0 });
    setAddGradeOpen(false);
  };

  const addParticipantRowFromDialog = () => {
    const label = newParticipantRow.rowLabel.trim();
    if (!label) {
      toast.error("Row label is required (e.g. 1, 2, 4-5).");
      return;
    }
    const parsed = parseParticipantRangeFromLabel(label);
    setMatrixRows((prev) => [
      {
        rowLabel: label,
        criteriaType: "PARTICIPANT_RANGE",
        programmeIds: [],
        categoryId: null,
        minParticipants: parsed.minParticipants,
        maxParticipants: parsed.maxParticipants,
        pointsByGrade: {},
      },
      ...prev,
    ]);
    setNewParticipantRow({
      rowLabel: "",
    });
    setAddParticipantOpen(false);
  };

  const addProgrammeRowFromDialog = () => {
    if (!newProgrammeRow.categoryId) {
      toast.error("Select category first.");
      return;
    }
    if (newProgrammeRow.programmeIds.length === 0) {
      toast.error("Select at least one programme.");
      return;
    }
    setMatrixRows((prev) => [
      {
        rowLabel: `Programme Set ${prev.length + 1}`,
        criteriaType: "PROGRAMME_SET",
        programmeIds: newProgrammeRow.programmeIds,
        categoryId: newProgrammeRow.categoryId,
        minParticipants: 1,
        maxParticipants: null,
        pointsByGrade: {},
      },
      ...prev,
    ]);
    setNewProgrammeRow({
      programmeIds: [],
      categoryId: null,
    });
    setAddProgrammeOpen(false);
  };

  const onSave = useCallback(() => {
    startTransition(async () => {
      try {
        const normalizedGrades = gradeRules.map((r) => ({
          grade: r.grade.trim().toUpperCase(),
          min: Number(r.min),
          max: Number(r.max),
        }));
        const normalizedGradeLabels = normalizedGrades.map((g) => g.grade);
        const preparedRows = ensurePointsShape(
          matrixRows,
          normalizedGradeLabels,
        );
        const missingGradePoint = preparedRows.some((row) =>
          normalizedGradeLabels.some((grade) => {
            const value = row.pointsByGrade[grade];
            return (
              value === undefined ||
              value === null ||
              Number.isNaN(Number(value))
            );
          }),
        );
        if (missingGradePoint) {
          toast.error("Each row must include points for all grade columns.");
          return;
        }
        const awardRules: AwardRule[] = [];
        preparedRows.forEach((row, rowIndex) => {
          normalizedGradeLabels.forEach((grade, gradeIndex) => {
            awardRules.push({
              criteriaType: row.criteriaType,
              rowLabel: row.rowLabel?.trim() || null,
              programmeIds:
                row.criteriaType === "PROGRAMME_SET" ? row.programmeIds : null,
              categoryId:
                row.criteriaType === "PROGRAMME_SET"
                  ? (row.categoryId ?? null)
                  : null,
              minParticipants:
                row.criteriaType === "PARTICIPANT_RANGE"
                  ? parseParticipantRangeFromLabel(row.rowLabel).minParticipants
                  : Number(row.minParticipants),
              maxParticipants:
                row.criteriaType === "PARTICIPANT_RANGE"
                  ? parseParticipantRangeFromLabel(row.rowLabel).maxParticipants
                  : null,
              grade,
              awardPoints: Number(row.pointsByGrade[grade] ?? 0),
              priority: rowIndex * 100 + gradeIndex,
            });
          });
        });
        await saveScoringPolicyAction({
          festivalId,
          noGradeBelow,
          gradeRules: normalizedGrades,
          awardRules,
        });
        setDirty(dirtySourceId, false);
        toast.success("Scoring policy saved.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save scoring policy.";
        toast.error(message);
      }
    });
  }, [
    dirtySourceId,
    festivalId,
    gradeRules,
    matrixRows,
    noGradeBelow,
    setDirty,
  ]);

  const initialComparisonKey = useMemo(
    () =>
      JSON.stringify(
        normalizeForComparison({
          noGradeBelow: policy.noGradeBelow,
          gradeRules: policy.gradeRules,
          matrixRows: (() => {
            const grouped = new Map<string, MatrixRow>();
            for (const rule of policy.awardRules) {
              const key = [
                rule.criteriaType ?? "PARTICIPANT_RANGE",
                rule.rowLabel ?? "",
                (rule.programmeIds ?? []).sort().join(","),
                rule.categoryId ?? "",
                rule.minParticipants,
                rule.maxParticipants ?? "",
              ].join("|");
              const existing = grouped.get(key);
              if (existing) {
                existing.pointsByGrade[rule.grade.toUpperCase()] =
                  rule.awardPoints;
                continue;
              }
              grouped.set(key, {
                rowLabel:
                  rule.rowLabel ??
                  (rule.criteriaType === "PROGRAMME_SET"
                    ? "Programme row"
                    : rule.maxParticipants &&
                        rule.maxParticipants !== rule.minParticipants
                      ? `${rule.minParticipants}-${rule.maxParticipants}`
                      : String(rule.minParticipants)),
                criteriaType: rule.criteriaType ?? "PARTICIPANT_RANGE",
                programmeIds: rule.programmeIds ?? [],
                categoryId: rule.categoryId ?? null,
                minParticipants: rule.minParticipants,
                maxParticipants: rule.maxParticipants ?? null,
                pointsByGrade: { [rule.grade.toUpperCase()]: rule.awardPoints },
              });
            }
            return grouped.size > 0
              ? Array.from(grouped.values())
              : [
                  {
                    rowLabel: "1",
                    criteriaType: "PARTICIPANT_RANGE",
                    programmeIds: [],
                    categoryId: null,
                    minParticipants: 1,
                    maxParticipants: 1,
                    pointsByGrade: {},
                  },
                ];
          })(),
        }),
      ),
    [policy.awardRules, policy.gradeRules, policy.noGradeBelow],
  );

  const currentComparisonKey = useMemo(
    () =>
      JSON.stringify(
        normalizeForComparison({
          noGradeBelow,
          gradeRules,
          matrixRows,
        }),
      ),
    [noGradeBelow, gradeRules, matrixRows],
  );

  const hasChanges = initialComparisonKey !== currentComparisonKey;
  const hasMissingGradePoint = useMemo(() => {
    if (availableGrades.length === 0) return true;
    return ensurePointsShape(matrixRows, availableGrades).some((row) =>
      availableGrades.some((grade) => {
        const value = row.pointsByGrade[grade];
        return (
          value === undefined || value === null || Number.isNaN(Number(value))
        );
      }),
    );
  }, [matrixRows, availableGrades]);

  useEffect(() => {
    registerDirtySource(dirtySourceId);
    return () => unregisterDirtySource(dirtySourceId);
  }, [dirtySourceId, registerDirtySource, unregisterDirtySource]);

  useEffect(() => {
    setDirty(dirtySourceId, hasChanges);
  }, [dirtySourceId, hasChanges, setDirty]);

  useEffect(() => {
    registerSaveHandler(dirtySourceId, async () => onSave());
    return () => unregisterSaveHandler(dirtySourceId);
  }, [dirtySourceId, onSave, registerSaveHandler, unregisterSaveHandler]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <ScoringPolicySection
        policyVersion={policy.policyVersion}
        normalizeTo={policy.normalizeTo}
        isPersisted={policy.isPersisted}
        noGradeBelow={noGradeBelow}
        setNoGradeBelow={setNoGradeBelow}
      />

      <GradeRulesSection
        gradeRules={gradeRules}
        onAddGrade={() => setAddGradeOpen(true)}
        onUpdateGradeRule={updateGradeRule}
        onRemoveGradeRule={(idx) =>
          setGradeRules((prev) =>
            prev.filter((_, currentIdx) => currentIdx !== idx),
          )
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Award Points Matrix</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setAddParticipantOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Participant Row
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddProgrammeOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Programme Row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Start with row label and grade points. Expand a row only when you
            need advanced filters.
          </p>

          {availableGrades.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Add at least one grade rule before entering matrix points.
            </div>
          )}

          <div className="space-y-2">
            {ensurePointsShape(matrixRows, availableGrades).map((row, idx) => (
              <div
                key={`matrix-row-${idx}`}
                className={
                  row.criteriaType === "PROGRAMME_SET"
                    ? "rounded-md border border-violet-500/60 bg-violet-500/5 p-2 ring-1 ring-violet-500/20"
                    : "rounded-md border p-2"
                }
              >
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant={
                      row.criteriaType === "PROGRAMME_SET"
                        ? "default"
                        : "secondary"
                    }
                    className="h-5 px-2 text-[10px]"
                  >
                    {row.criteriaType === "PROGRAMME_SET"
                      ? "Programme Row"
                      : "Participant Row"}
                  </Badge>
                  {row.criteriaType === "PROGRAMME_SET" && (
                    <span className="text-[11px] text-violet-200/90">
                      Applies to selected programmes only
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1fr_3fr_auto] md:items-center">
                  {row.criteriaType === "PROGRAMME_SET" ? (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-[10px] uppercase"
                        >
                          {categories.find((c) => c.id === row.categoryId)
                            ?.name ?? "No category"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {row.programmeIds.length} selected
                        </span>
                      </div>
                      {row.programmeIds.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {row.programmeIds.map((id) => (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="h-5 max-w-full truncate px-2 text-[10px]"
                              title={programmeNameById.get(id) ?? id}
                            >
                              {programmeNameById.get(id) ?? "Unknown programme"}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          No programmes selected.
                        </p>
                      )}
                    </div>
                  ) : (
                    <Input
                      value={row.rowLabel}
                      onChange={(e) =>
                        updateMatrixRow(idx, { rowLabel: e.target.value })
                      }
                      placeholder="Row label"
                      className="h-9"
                    />
                  )}
                  <div className="text-xs text-muted-foreground">
                    {rowCriteriaSummary(row)}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {availableGrades.map((grade) => (
                      <div
                        key={`grade-point-${idx}-${grade}`}
                        className="space-y-1"
                      >
                        <Label className="text-[11px]">{grade}</Label>
                        <Input
                          type="number"
                          value={row.pointsByGrade[grade] ?? 0}
                          onChange={(e) =>
                            updateMatrixGradePoint(
                              idx,
                              grade,
                              Number(e.target.value),
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 justify-start px-2 text-xs md:justify-center"
                    onClick={() =>
                      setMatrixRows((prev) =>
                        prev.filter((_, rowIndex) => rowIndex !== idx),
                      )
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>

                {row.criteriaType === "PROGRAMME_SET" ? (
                  <details className="mt-2 rounded-md border border-violet-500/30 bg-violet-500/10 p-2">
                    <summary className="cursor-pointer text-xs font-medium">
                      Advanced options
                    </summary>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                      <div className="space-y-1 md:col-span-4">
                        <Label>Programmes</Label>
                        {!row.categoryId ? (
                          <div className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
                            Select category first to choose programmes.
                          </div>
                        ) : (
                          <div className="max-h-28 space-y-1 overflow-auto rounded-md border bg-background p-2">
                            {getProgrammesByCategory(row.categoryId).map(
                              (programme) => {
                                const checked = row.programmeIds.includes(
                                  programme.id,
                                );
                                return (
                                  <label
                                    key={programme.id}
                                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        updateMatrixRow(idx, {
                                          programmeIds: toggleInList(
                                            row.programmeIds,
                                            programme.id,
                                          ),
                                        })
                                      }
                                    />
                                    <span className="text-xs">
                                      {programme.name}
                                    </span>
                                  </label>
                                );
                              },
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Selected: {row.programmeIds.length}
                        </p>
                      </div>
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={isPending || !hasChanges || hasMissingGradePoint}
          className="w-full sm:w-auto"
        >
          <Save className="mr-2 h-4 w-4" />
          {isPending
            ? "Saving..."
            : hasChanges
              ? "Save Scoring Policy"
              : "No Changes"}
        </Button>
      </div>

      <Dialog open={addGradeOpen} onOpenChange={setAddGradeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Grade</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add a new grade band. Matrix columns update automatically.
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Grade Label</Label>
              <Input
                value={newGrade.grade}
                onChange={(e) =>
                  setNewGrade((prev) => ({ ...prev, grade: e.target.value }))
                }
                placeholder="A+"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Min</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newGrade.min}
                  onChange={(e) =>
                    setNewGrade((prev) => ({
                      ...prev,
                      min: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Max</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newGrade.max}
                  onChange={(e) =>
                    setNewGrade((prev) => ({
                      ...prev,
                      max: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGradeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addGradeFromDialog}>Add Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Participant Row</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Fast default: set only Min Participants. Max can stay same.
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Row Label (optional)</Label>
              <Input
                value={newParticipantRow.rowLabel}
                onChange={(e) =>
                  setNewParticipantRow((prev) => ({
                    ...prev,
                    rowLabel: e.target.value,
                  }))
                }
                placeholder="e.g. 1, 2, 4-5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddParticipantOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={addParticipantRowFromDialog}>
              Add Participant Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addProgrammeOpen} onOpenChange={setAddProgrammeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Programme Row</DialogTitle>
            <p className="text-sm text-muted-foreground">
              One row can apply to multiple programmes.
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={newProgrammeRow.categoryId ?? ""}
                onChange={(e) =>
                  setNewProgrammeRow((prev) => ({
                    ...prev,
                    categoryId: e.target.value ? e.target.value : null,
                    programmeIds: [],
                  }))
                }
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Select Programmes</Label>
              {!newProgrammeRow.categoryId ? (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Select category first.
                </div>
              ) : (
                <div className="max-h-36 space-y-1 overflow-auto rounded-md border bg-background p-2">
                  {getProgrammesByCategory(newProgrammeRow.categoryId).map(
                    (programme) => {
                      const checked = newProgrammeRow.programmeIds.includes(
                        programme.id,
                      );
                      return (
                        <label
                          key={programme.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setNewProgrammeRow((prev) => ({
                                ...prev,
                                programmeIds: toggleInList(
                                  prev.programmeIds,
                                  programme.id,
                                ),
                              }))
                            }
                          />
                          <span className="text-sm">{programme.name}</span>
                        </label>
                      );
                    },
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Selected programmes: {newProgrammeRow.programmeIds.length}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddProgrammeOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={addProgrammeRowFromDialog}>
              Add Programme Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
