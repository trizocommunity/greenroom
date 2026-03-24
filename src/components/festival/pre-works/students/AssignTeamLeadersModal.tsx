"use client";

import { useMemo, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";

interface AssignTeamLeadersModalProps {
  festivalId: string;
  teamLeaderLimit: number;
  trigger?: React.ReactNode;
}

export function AssignTeamLeadersModal({
  festivalId,
  teamLeaderLimit,
  trigger,
}: AssignTeamLeadersModalProps) {
  const effectiveLimit = Number.isFinite(teamLeaderLimit) && teamLeaderLimit > 0
    ? Math.floor(teamLeaderLimit)
    : 2;
  const [open, setOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);

  const { groups, updateGroup, isUpdating } = useGroups(festivalId);
  const { students } = useStudents(festivalId);

  const selectedGroup = useMemo(
    () => groups.find((g: any) => g.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const groupStudents = useMemo(
    () => students.filter((s: any) => s.groupId === selectedGroupId),
    [students, selectedGroupId],
  );

  const existingLeaderIds = useMemo(
    () => groupStudents.filter((s: any) => s.isTeamLeader).map((s: any) => s.id),
    [groupStudents],
  );

  const canSubmit = !!selectedGroupId && selectedLeaderIds.length > 0 && !isUpdating;

  const toggleLeader = (studentId: string) => {
    setSelectedLeaderIds((prev) => {
      const exists = prev.includes(studentId);
      if (exists) return prev.filter((id) => id !== studentId);
      if (prev.length >= effectiveLimit) return prev;
      return [...prev, studentId];
    });
  };

  const onGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const groupStudentIds = students
      .filter((s: any) => s.groupId === groupId && s.isTeamLeader)
      .map((s: any) => s.id)
      .slice(0, effectiveLimit);
    setSelectedLeaderIds(groupStudentIds);
  };

  const handleSubmit = async () => {
    if (!selectedGroup) return;
    const selectedStudents = groupStudents.filter((s: any) =>
      selectedLeaderIds.includes(s.id),
    );
    const hasInvalidEmail = selectedStudents.some(
      (s: any) => !s.email || !String(s.email).includes("@"),
    );
    if (hasInvalidEmail) {
      toast.error("Selected leaders must have a valid email address.");
      return;
    }

    await updateGroup({
      id: selectedGroup.id,
      data: {
        name: selectedGroup.name,
        seriesStart: Number(selectedGroup.seriesStart ?? 100),
        color: selectedGroup.color ?? "#2563eb",
        teamLeaderIds: selectedLeaderIds,
      },
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Crown className="h-4 w-4 sm:mr-2 text-amber-600" />
            <span className="hidden sm:inline">Assign Team Leaders</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Assign Team Leaders</DialogTitle>
          <DialogDescription>
            Select a group, then choose up to {effectiveLimit} team leaders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Group</Label>
            <Select value={selectedGroupId} onValueChange={onGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group: any) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedGroupId ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Select a group to view students and assign team leaders.
            </div>
          ) : groupStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No students in this group yet.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Students in <span className="font-medium">{selectedGroup?.name}</span> (
                {selectedLeaderIds.length}/{effectiveLimit} selected)
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-lg border bg-muted/10 p-2">
                {groupStudents.map((student: any) => {
                  const isSelected = selectedLeaderIds.includes(student.id);
                  const hasValidEmail =
                    !!student.email && String(student.email).includes("@");
                  const disableUnchecked =
                    !isSelected &&
                    (selectedLeaderIds.length >= effectiveLimit ||
                      !hasValidEmail);
                  const isExistingLeader = existingLeaderIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 rounded-md border p-3 transition ${
                        disableUnchecked
                          ? "opacity-60 cursor-not-allowed bg-muted/20"
                          : "cursor-pointer hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={isSelected}
                        disabled={disableUnchecked}
                        onChange={() => toggleLeader(student.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{student.name}</span>
                          {!hasValidEmail && (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-700">
                              Valid email required
                            </span>
                          )}
                          {isExistingLeader && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Current Leader
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Group: {student.group?.name ?? "—"} | Category:{" "}
                          {student.category?.name ?? "—"} | Chest:{" "}
                          {student.chestNumber ?? "—"} | Email:{" "}
                          {student.email ?? "—"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Team Leaders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
