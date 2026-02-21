"use client";

import { Loader2, Plus, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/useCategories";
import { useProgrammeDetails, useProgrammes } from "@/hooks/useProgrammes";

interface ProgrammeDialogProps {
  festivalId: string;
  programme?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
}

export function ProgrammeDialog({
  festivalId,
  programme,
  trigger,
  readOnly = false,
}: ProgrammeDialogProps) {
  const [open, setOpen] = useState(false);
  const { createProgramme, isCreating, updateProgramme, isUpdating } =
    useProgrammes(festivalId);
  const { categories } = useCategories(festivalId);

  // Parse maxEntries and maxTeamSize safely for formState
  // They might be strings in input but numbers in DB
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    maxParticipantsPerGroup: 1,
    maxTeamsPerGroup: 1,
    maxStudentsPerTeam: 1,
  });

  const isEditing = !!programme;
  const isLoadingAction = isCreating || isUpdating;

  // Fetch details if viewing (readOnly)
  const { programme: details, isLoading: isLoadingDetails } =
    useProgrammeDetails(
      festivalId,
      open && readOnly ? programme?.id : undefined,
    );

  useEffect(() => {
    if (open) {
      if (programme) {
        setFormData({
          name: programme.name || "",
          categoryId: programme.categoryId || "",
          type: programme.type || "INDIVIDUAL",
          stageType: programme.stageType || "STAGE",
          maxParticipantsPerGroup: programme.maxParticipantsPerGroup || 1,
          maxTeamsPerGroup: programme.maxTeamsPerGroup || 1,
          maxStudentsPerTeam: programme.maxStudentsPerTeam || 1,
        });
      } else {
        setFormData({
          name: "",
          categoryId: "",
          type: "INDIVIDUAL",
          stageType: "STAGE",
          maxParticipantsPerGroup: 1,
          maxTeamsPerGroup: 1,
          maxStudentsPerTeam: 1,
        });
      }
    }
  }, [open, programme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    try {
      if (isEditing && programme) {
        await updateProgramme({ id: programme.id, data: formData });
      } else {
        await createProgramme(formData);
      }
      setOpen(false);
      if (!isEditing) {
        setFormData({
          name: "",
          categoryId: "",
          type: "INDIVIDUAL",
          stageType: "STAGE",
          maxParticipantsPerGroup: 1,
          maxTeamsPerGroup: 1,
          maxStudentsPerTeam: 1,
        });
      }
    } catch (error) {
      // Handled by hook
    }
  };

  const renderDetails = () => {
    if (isLoadingDetails) {
      return (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!details) return <div className="p-4">Failed to load details.</div>;

    const assignments = details.assignments || [];

    return (
      <div className="space-y-6">
        {/* Header Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground">Category</span>
            <div className="font-medium">{details.category?.name}</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Type</span>
            <div className="flex gap-2">
              <Badge variant="outline">{details.type}</Badge>
              <Badge variant="secondary">
                {details.stageType === "STAGE" ? "Stage" : "Off-Stage"}
              </Badge>
            </div>
          </div>
          {details.type === "INDIVIDUAL" ? (
            <div className="space-y-1">
              <span className="text-muted-foreground">Max Entries/Group</span>
              <div className="font-medium">
                {details.maxParticipantsPerGroup}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <span className="text-muted-foreground">Max Teams/Group</span>
                <div className="font-medium">{details.maxTeamsPerGroup}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Students/Team</span>
                <div className="font-medium">{details.maxStudentsPerTeam}</div>
              </div>
            </>
          )}
        </div>

        {/* Assignments Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              Assigned Students ({assignments.length})
            </h4>
          </div>
          <div className="rounded-md border h-[300px] overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Student</TableHead>

                    <TableHead>Group</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment: any, index: number) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {assignment.student?.name}
                      </TableCell>

                      <TableCell>
                        {assignment.student?.group ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor:
                                  assignment.student.group.color || "#2563eb",
                              }}
                            />
                            <span className="font-medium">
                              {assignment.student.group.name}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {assignments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <User className="h-5 w-5 text-muted-foreground/50" />
                          <span className="text-xs">No assignments yet</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Programme
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={readOnly ? "max-w-2xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? formData.name
              : isEditing
                ? "Edit Programme"
                : "Create Programme"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View programme details and assignments."
              : "Configure programme rules."}
          </DialogDescription>
        </DialogHeader>

        {readOnly ? (
          renderDetails()
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                required
                value={formData.categoryId}
                onValueChange={(val) =>
                  setFormData({ ...formData, categoryId: val })
                }
                disabled={readOnly || isLoadingAction}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Programme Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Recitation"
                disabled={readOnly || isLoadingAction}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData({ ...formData, type: val })
                  }
                  disabled={readOnly || isLoadingAction}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="GROUP">Group</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Determines assignment structure.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stageType">Stage Type</Label>
                <Select
                  value={formData.stageType}
                  onValueChange={(val) =>
                    setFormData({ ...formData, stageType: val })
                  }
                  disabled={readOnly || isLoadingAction}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAGE">Stage</SelectItem>
                    <SelectItem value="NON_STAGE">Non-Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.type === "INDIVIDUAL" ? (
                <div className="space-y-2">
                  <Label htmlFor="maxParticipantsPerGroup">
                    Max Entries (per Group)
                  </Label>
                  <Input
                    id="maxParticipantsPerGroup"
                    type="number"
                    min={1}
                    required
                    value={formData.maxParticipantsPerGroup}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxParticipantsPerGroup:
                          parseInt(e.target.value, 10) || 1,
                      })
                    }
                    disabled={readOnly || isLoadingAction}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="maxTeamsPerGroup">
                      Max Teams (per Group)
                    </Label>
                    <Input
                      id="maxTeamsPerGroup"
                      type="number"
                      min={1}
                      required
                      value={formData.maxTeamsPerGroup}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxTeamsPerGroup: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      disabled={readOnly || isLoadingAction}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxStudentsPerTeam">
                      Max Students (per Team)
                    </Label>
                    <Input
                      id="maxStudentsPerTeam"
                      type="number"
                      min={1}
                      required
                      value={formData.maxStudentsPerTeam}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxStudentsPerTeam: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      disabled={readOnly || isLoadingAction}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoadingAction}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoadingAction}>
                {isLoadingAction && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
