"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import {
  useProgrammes,
  useParticipants,
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
} from "@/components/festival/editions/pre-works/hooks";
import { Loader2, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFestival } from "@/components/festival/FestivalContext";

export default function AssignmentsPage() {
  const { activeEdition } = useFestival();
  const editionId = activeEdition?.id;

  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(
    null,
  );

  const { data: programmes } = useProgrammes(editionId || "");
  const { data: assignments, isLoading: loadingAssignments } = useAssignments(
    editionId || "",
    selectedProgrammeId || undefined,
  );

  // Fetch ALL participants for selection (could be optimized)
  const { data: participants } = useParticipants(editionId || "");

  const createMutation = useCreateAssignment(editionId || "");
  const deleteMutation = useDeleteAssignment(editionId || "");

  const [isOpen, setIsOpen] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] =
    useState<string>("");

  const handleCreate = async () => {
    if (!selectedProgrammeId || !selectedParticipantId) return;
    await createMutation.mutateAsync({
      programmeId: selectedProgrammeId,
      participantId: selectedParticipantId,
    });
    setIsOpen(false);
    setSelectedParticipantId("");
  };

  if (!editionId) return <div>Loading...</div>;

  const currentProgramme = programmes?.find(
    (p: any) => p.id === selectedProgrammeId,
  );

  // Filter participants to match programme category
  const eligibleParticipants = participants?.filter((p: any) =>
    currentProgramme ? p.categoryId === currentProgramme.categoryId : true,
  );

  console.log(assignments);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Programme Assignment
        </h1>
        <p className="text-muted-foreground">
          Assign participants to programmes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Programme</CardTitle>
          <CardDescription>
            Choose a programme to manage assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProgrammeId || ""}
            onValueChange={setSelectedProgrammeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a programme..." />
            </SelectTrigger>
            <SelectContent>
              {programmes?.map((prog: any) => (
                <SelectItem key={prog.id} value={prog.id}>
                  {prog.name} ({prog.category?.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProgrammeId && currentProgramme && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{currentProgramme.name}</CardTitle>
              <CardDescription>
                Category: {currentProgramme.category?.name} | Type:{" "}
                {currentProgramme.type} | Max Entries:{" "}
                {currentProgramme.maxEntries}
              </CardDescription>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Participant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Participant</DialogTitle>
                  <DialogDescription>
                    Select a participant to assign to {currentProgramme.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="participant">Participant</Label>
                    <Select
                      value={selectedParticipantId}
                      onValueChange={setSelectedParticipantId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select participant" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleParticipants?.map((p: any) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={assignments?.some(
                              (a: any) => a.participantId === p.id,
                            )}
                          >
                            {p.name} ({p.group?.name})
                          </SelectItem>
                        ))}
                        {eligibleParticipants?.length === 0 && (
                          <SelectItem value="none" disabled>
                            No eligible participants found for this category
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={
                      createMutation.isPending || !selectedParticipantId
                    }
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingAssignments ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Assigned At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No assignments yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {assignments?.map((assign: any) => (
                    <TableRow key={assign.id}>
                      <TableCell className="font-medium">
                        {assign.participant?.name}
                      </TableCell>
                      <TableCell>{assign.participant?.group?.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(assign.assignedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Remove assignment?"))
                              deleteMutation.mutate(assign.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedProgrammeId && (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          Select a programme to view assignments
        </div>
      )}

      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        💡 <strong>Tip:</strong> You can only assign participants belonging to
        the same category as the programme.
      </div>
    </div>
  );
}
