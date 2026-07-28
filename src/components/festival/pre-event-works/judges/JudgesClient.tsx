"use client";

import {
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  useCreateJudge,
  useDeleteJudge,
  useJudges,
  useUpdateJudge,
} from "@/api/client";
import { useStages } from "@/api/client/stages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ERROR_MESSAGES } from "@/core/errors/errors";
import { StagePickerCards } from "@/components/festival/stage-assignment/StagePickerCards";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

type JudgeRow = {
  id: string;
  name: string;
  description: string | null;
  activities: Array<{
    configId: string;
    judgingMode: string;
    status: string;
    programme: { id: string; name: string } | null;
    stage: { id: string; name: string } | null;
    judgedPointsCount: number;
    averagePoints: number | null;
  }>;
  programmes: Array<{ id: string; name: string }>;
  stages: Array<{ id: string; name: string }>;
  assignedStages: Array<{ id: string; name: string }>;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizeJudgeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

const JUDGE_NAME_MIN_LENGTH = 2;
const JUDGE_NAME_MAX_LENGTH = 80;
const JUDGE_DESCRIPTION_MAX_LENGTH = 500;

export function JudgesClient({
  festivalId,
  children,
}: {
  festivalId: string;
  children?: React.ReactNode;
}) {
  const { isReadOnly } = useFestivalReadOnly();
  const { data: judges = [], isLoading } = useJudges(festivalId);
  const { data: stages = [] } = useStages(festivalId);
  const createJudge = useCreateJudge();
  const updateJudge = useUpdateJudge();
  const deleteJudge = useDeleteJudge();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JudgeRow | null>(null);
  const [deleting, setDeleting] = useState<JudgeRow | null>(null);
  const [viewingActivities, setViewingActivities] = useState<JudgeRow | null>(
    null,
  );
  const [viewingProgrammes, setViewingProgrammes] = useState<JudgeRow | null>(
    null,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const sameStageIds = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  const hasFormChanges = editing
    ? trimmedName !== editing.name.trim() ||
      trimmedDescription !== (editing.description ?? "").trim() ||
      !sameStageIds(
        stageIds,
        editing.assignedStages.map((s) => s.id),
      )
    : trimmedName.length > 0 ||
      trimmedDescription.length > 0 ||
      stageIds.length > 0;

  const validateForm = () => {
    const nextErrors: { name?: string; description?: string } = {};
    if (!trimmedName) {
      nextErrors.name = ERROR_MESSAGES.JUDGE_NAME_REQUIRED;
    } else if (trimmedName.length < JUDGE_NAME_MIN_LENGTH) {
      nextErrors.name = `Judge name must be at least ${JUDGE_NAME_MIN_LENGTH} characters.`;
    } else if (trimmedName.length > JUDGE_NAME_MAX_LENGTH) {
      nextErrors.name = `Judge name must be ${JUDGE_NAME_MAX_LENGTH} characters or fewer.`;
    } else {
      const duplicateJudge = judges.find((judge) => {
        if (editing && judge.id === editing.id) return false;
        return (
          normalizeJudgeName(judge.name) === normalizeJudgeName(trimmedName)
        );
      });
      if (duplicateJudge) {
        nextErrors.name = ERROR_MESSAGES.JUDGE_NAME_DUPLICATE;
      }
    }

    if (trimmedDescription.length > JUDGE_DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = `Description must be ${JUDGE_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFormOpenChange = (open: boolean) => {
    if (!open && hasFormChanges && !isSaving) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes. Do you want to discard them?",
      );
      if (!shouldDiscard) return;
    }
    setFormOpen(open);
    if (!open) {
      setFormErrors({});
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setStageIds([]);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: JudgeRow) => {
    setEditing(row);
    setName(row.name);
    setDescription(row.description ?? "");
    setStageIds(row.assignedStages.map((s) => s.id));
    setFormErrors({});
    setFormOpen(true);
  };

  const onSubmit = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editing) {
        await updateJudge.mutateAsync({
          festivalId,
          judgeId: editing.id,
          data: {
            name: trimmedName,
            description: trimmedDescription || undefined,
            stageIds,
          },
        });
      } else {
        await createJudge.mutateAsync({
          festivalId,
          data: {
            name: trimmedName,
            description: trimmedDescription || undefined,
            stageIds,
          },
        });
      }
      setFormOpen(false);
      setFormErrors({});
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        {children}
        <Button onClick={openCreate} disabled={isReadOnly}>
          <Plus className="h-4 w-4 mr-2" />
          Add Judge
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {judges.map((j) => (
          <div
            key={j.id}
            className="group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20"
          >
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 shrink-0 rounded-full border bg-muted/50 flex items-center justify-center text-xs font-semibold">
                    {getInitials(j.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2">
                      {j.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {j.description || "No description"}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setViewingActivities(j as JudgeRow)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Activities
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setViewingProgrammes(j as JudgeRow)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Programmes
                    </DropdownMenuItem>
                    {!isReadOnly ? (
                      <DropdownMenuItem
                        onSelect={() => openEdit(j as JudgeRow)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    ) : null}
                    {!isReadOnly ? (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleting(j as JudgeRow)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Spacer so footer stays at bottom */}
              <div className="flex-1 min-h-4" />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Assigned stages
                </p>
                <div className="flex flex-wrap gap-2">
                  {j.assignedStages && j.assignedStages.length > 0 ? (
                    j.assignedStages
                      .slice(0, 3)
                      .map((stage) => (
                        <Badge
                          key={stage.id}
                          className="bg-primary/10 text-primary border-primary/30"
                          variant="outline"
                        >
                          {stage.name}
                        </Badge>
                      ))
                      .concat(
                        j.assignedStages.length > 3
                          ? ([
                              <Badge
                                key={`${j.id}-more-stages`}
                                variant="outline"
                              >
                                +{j.assignedStages.length - 3} more
                              </Badge>,
                            ] as any)
                          : [],
                      )
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No stages assigned
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm whitespace-nowrap">
                    <span className="font-semibold text-foreground">
                      {j.activities?.length ?? 0}
                    </span>
                    <span className="text-muted-foreground"> Activities</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 border-l border-border pl-4">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm whitespace-nowrap">
                    <span className="font-semibold text-foreground">
                      {j.programmes?.length ?? 0}
                    </span>
                    <span className="text-muted-foreground"> Programmes</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 border-l border-border pl-4">
                  <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm whitespace-nowrap">
                    <span className="font-semibold text-foreground">
                      {j.assignedStages?.length ?? 0}
                    </span>
                    <span className="text-muted-foreground"> Stages</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {judges.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No judges created yet.
        </div>
      ) : null}

      <Drawer open={formOpen} onOpenChange={handleFormOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editing ? "Edit Judge" : "Create Judge"}</DrawerTitle>
            <DrawerDescription>
              Keep judge profile details updated for judging workflows.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) {
                  setFormErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="Judge name"
              maxLength={JUDGE_NAME_MAX_LENGTH + 20}
            />
            {formErrors.name ? (
              <p className="text-xs text-destructive">{formErrors.name}</p>
            ) : null}
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (formErrors.description) {
                  setFormErrors((prev) => ({
                    ...prev,
                    description: undefined,
                  }));
                }
              }}
              placeholder="Description (optional)"
              rows={4}
              maxLength={JUDGE_DESCRIPTION_MAX_LENGTH + 50}
            />
            <div className="flex items-center justify-between">
              {formErrors.description ? (
                <p className="text-xs text-destructive">
                  {formErrors.description}
                </p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">
                {trimmedDescription.length}/{JUDGE_DESCRIPTION_MAX_LENGTH}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Stages (Optional)</Label>
              <StagePickerCards
                stages={stages}
                selectedIds={stageIds}
                onChange={setStageIds}
              />
            </div>
          </div>
          <DrawerFooter>
            <Button
              variant="outline"
              onClick={() => handleFormOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={
                !trimmedName ||
                isSaving ||
                trimmedName.length > JUDGE_NAME_MAX_LENGTH
              }
            >
              {isSaving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={!!viewingActivities}
        onOpenChange={(open) => !open && setViewingActivities(null)}
      >
        <DrawerContent>
          {viewingActivities ? (
            <>
              <DrawerHeader>
                <DrawerTitle>{viewingActivities.name} - Activities</DrawerTitle>
                <DrawerDescription>
                  Assigned judging activities and scoring progress.
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-2">
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {viewingActivities.activities.length > 0 ? (
                    viewingActivities.activities.map((activity) => (
                      <div
                        key={activity.configId}
                        className="rounded-lg border p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.programme?.name ?? "Programme"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.stage?.name ?? "No stage"} ·{" "}
                            {activity.judgingMode}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Judged points: {activity.judgedPointsCount}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            Avg: {activity.averagePoints ?? "-"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No activities assigned.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={!!viewingProgrammes}
        onOpenChange={(open) => !open && setViewingProgrammes(null)}
      >
        <DrawerContent>
          {viewingProgrammes ? (
            <>
              <DrawerHeader>
                <DrawerTitle>{viewingProgrammes.name} - Programmes</DrawerTitle>
                <DrawerDescription>
                  Programme-wise judging points and score averages.
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-2">
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {viewingProgrammes.programmes.length > 0 ? (
                    viewingProgrammes.programmes.map((programme) => {
                      const programmeActivities =
                        viewingProgrammes.activities.filter(
                          (activity) => activity.programme?.id === programme.id,
                        );
                      const totalPoints = programmeActivities.reduce(
                        (sum, activity) => sum + activity.judgedPointsCount,
                        0,
                      );
                      const avgPool = programmeActivities
                        .map((activity) => activity.averagePoints)
                        .filter((value): value is number => value !== null);
                      const programmeAverage =
                        avgPool.length > 0
                          ? Number(
                              (
                                avgPool.reduce((sum, value) => sum + value, 0) /
                                avgPool.length
                              ).toFixed(2),
                            )
                          : null;

                      return (
                        <div
                          key={programme.id}
                          className="rounded-lg border p-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-medium truncate">
                              {programme.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Activities: {programmeActivities.length}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Points: {totalPoints}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              Avg: {programmeAverage ?? "-"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No programmes assigned.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      {deleting ? (
        <DeleteDialog
          title="Delete Judge"
          description="This judge will be removed from future judgment configurations."
          open={true}
          onOpenChange={(open) => !open && setDeleting(null)}
          onDelete={async () => {
            await deleteJudge.mutateAsync({ festivalId, judgeId: deleting.id });
            setDeleting(null);
          }}
          isDeleting={deleteJudge.isPending}
        />
      ) : null}
    </div>
  );
}
