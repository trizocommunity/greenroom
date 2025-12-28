import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { notFound } from "next/navigation";
import { CreateTeamLeaderModal } from "@/components/festival/teams/CreateTeamLeaderModal";
import { getTeamLeaders } from "@/server/actions/team.actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlugOrId(slug);

  if (!festival) {
    notFound();
  }

  const teamLeaders = await getTeamLeaders(festival.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage your festival team leaders and their access.
          </p>
        </div>
        <CreateTeamLeaderModal festivalId={festival.id} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Initial Password (Meta)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamLeaders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No team leaders found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              teamLeaders.map((leader) => (
                <TableRow key={leader.id}>
                  <TableCell className="font-medium">
                    {leader.fullName || "N/A"}
                  </TableCell>
                  <TableCell>{leader.email}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {leader.initialPassword || (
                      <span className="text-muted-foreground italic">
                        Redacted
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        leader.status === "Active" ? "default" : "secondary"
                      }
                    >
                      {leader.status}
                    </Badge>
                  </TableCell>
                  <TableCell>Team Leader</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
