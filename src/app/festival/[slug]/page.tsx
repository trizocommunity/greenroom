import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Users, Calendar, Trophy, HardDrive } from "lucide-react";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { getSession } from "@/lib/auth/session";
import { findMemberByFestivalAndUser } from "@/server/models/member.model";
import { prisma } from "@/lib/db";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch Festival
  const festival = await findFestivalBySlugOrId(slug);

  if (!festival) notFound();

  // Fetch current user member role
  const session = await getSession();
  const member = session?.userId
    ? await findMemberByFestivalAndUser(festival.id, session.userId)
    : null;

  const isTeamLeader = member?.role === "TEAM_LEADER";
  let teamLeaderGroup = null;

  if (isTeamLeader && member?.groupId) {
    // Fetch group details
    teamLeaderGroup = await prisma.group.findUnique({
      where: { id: member.groupId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });
  }

  // Helper to format numbers
  const fmt = (n: number | undefined) => n?.toLocaleString() || "0";

  return (
    <div className="space-y-6">
      {isTeamLeader && teamLeaderGroup ? (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground p-5 shadow">
            <h3 className="font-semibold leading-none tracking-tight">
              My Group: {teamLeaderGroup.name}
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  My Participants
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(teamLeaderGroup._count.participants)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered in {teamLeaderGroup.name}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {festival.expiresAt && (
            <div className="bg-muted/50 p-2 text-xs text-center text-muted-foreground border-b mb-4">
              Expires on {new Date(festival.expiresAt).toLocaleDateString()}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Participants
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(festival.participantsCount)}
                </div>
                <p className="text-xs text-muted-foreground">Registered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(festival.eventsCount)}
                </div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Judges</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(festival.judgesCount)}
                </div>
                <p className="text-xs text-muted-foreground">Assigned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(festival.storageUsedMB)} MB
                </div>
                <p className="text-xs text-muted-foreground">Used</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
