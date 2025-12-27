import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Users, Calendar, Trophy, HardDrive } from "lucide-react";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch Festival
  const festival = await findFestivalBySlugOrId(slug);

  if (!festival) notFound();

  // Helper to format numbers
  const fmt = (n: number | undefined) => n?.toLocaleString() || "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{festival.name}</h1>
        <p className="text-muted-foreground">
          {festival.status}
          {festival.expiresAt &&
            ` • Expires ${format(new Date(festival.expiresAt), "PPP")}`}
        </p>
      </div>

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
  );
}
