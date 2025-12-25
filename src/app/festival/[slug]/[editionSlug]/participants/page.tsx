import { findParticipantsByEdition } from "@/server/models/participant.model";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { notFound } from "next/navigation";
import { AddParticipantForm } from "@/components/festival/participants/AddParticipantForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { PermissionGate } from "@/components/festival/PermissionGate";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const festival = await findFestivalBySlugOrId(festivalSlug);

  if (!festival) {
    notFound();
  }

  // Determine active edition
  const activeEdition =
    festival.editions.find((e) => e.status === "ACTIVE") ||
    festival.editions[0];

  if (!activeEdition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        No active edition found. Create an edition to manage participants.
      </div>
    );
  }

  const participants = await findParticipantsByEdition(activeEdition.id);
  const currentCount = participants.length;
  const maxParticipants = activeEdition.limits?.maxParticipants || 1000;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Participants</h2>
          <p className="text-muted-foreground">
            Managing participants for{" "}
            <h1 className="text-2xl font-bold tracking-tight uppercase">
              {activeEdition.slug} Participants
            </h1>
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium border px-4 py-2 rounded-lg bg-muted/50">
          <span>Capacity:</span>
          <span
            className={
              currentCount >= maxParticipants
                ? "text-destructive"
                : "text-foreground"
            }
          >
            {currentCount} / {maxParticipants}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registered At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.name}
                      </TableCell>
                      <TableCell>{participant.email}</TableCell>
                      <TableCell>
                        {format(new Date(participant.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {participants.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No participants registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <PermissionGate requiredStatus="ACTIVE" fallbackType="block">
            <Card>
              <CardHeader>
                <CardTitle>Add Participant</CardTitle>
                <CardDescription>
                  Register a new participant manually.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AddParticipantForm />
              </CardContent>
            </Card>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
