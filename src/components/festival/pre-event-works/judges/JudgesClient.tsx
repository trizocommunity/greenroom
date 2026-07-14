"use client";

import { Eye, Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ERROR_MESSAGES } from "@/core/errors/errors";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  useCreateJudge,
  useDeleteJudge,
  useJudges,
  useUpdateJudge,
} from "@/api/client";

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
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const hasFormChanges = editing
    ? trimmedName !== editing.name.trim() ||
      trimmedDescription !== (editing.description ?? "").trim()
    : trimmedName.length > 0 || trimmedDescription.length > 0;

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
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: JudgeRow) => {
    setEditing(row);
    setName(row.name);
    setDescription(row.description ?? "");
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
          },
        });
      } else {
        await createJudge.mutateAsync({
          festivalId,
          data: {
            name: trimmedName,
            description: trimmedDescription || undefined,
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
            className="rounded-2xl border bg-card p-4 flex flex-col gap-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full border bg-muted/50 flex items-center justify-center text-xs font-semibold">
                  {getInitials(j.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate tracking-wide">
                    {j.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {j.description || "No description"}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
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
                    <DropdownMenuItem onSelect={() => openEdit(j as JudgeRow)}>
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

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Stage highlights
              </p>
              <div className="flex flex-wrap gap-2">
                {j.stages && j.stages.length > 0 ? (
                  j.stages
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
                      j.stages.length > 3
                        ? ([
                            <Badge
                              key={`${j.id}-more-stages`}
                              variant="outline"
                            >
                              +{j.stages.length - 3} more
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

            <div className="grid grid-cols-3 gap-2 text-center rounded-xl border bg-muted/20 p-2">
              <div>
                <p className="text-lg font-semibold leading-none">
                  {j.activities?.length ?? 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Activities
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold leading-none">
                  {j.programmes?.length ?? 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Programmes
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold leading-none">
                  {j.stages?.length ?? 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Stages</p>
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

      <Dialog open={formOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Judge" : "Create Judge"}</DialogTitle>
            <DialogDescription>
              Keep judge profile details updated for judging workflows.
            </DialogDescription>
          </DialogHeader>
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
          </div>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingActivities}
        onOpenChange={(open) => !open && setViewingActivities(null)}
      >
        <DialogContent className="max-w-3xl">
          {viewingActivities ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewingActivities.name} - Activities</DialogTitle>
                <DialogDescription>
                  Assigned judging activities and scoring progress.
                </DialogDescription>
              </DialogHeader>

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
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingProgrammes}
        onOpenChange={(open) => !open && setViewingProgrammes(null)}
      >
        <DialogContent className="max-w-3xl">
          {viewingProgrammes ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewingProgrammes.name} - Programmes</DialogTitle>
                <DialogDescription>
                  Programme-wise judging points and score averages.
                </DialogDescription>
              </DialogHeader>

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
        </DialogContent>
      </Dialog>

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
