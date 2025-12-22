import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Users, Calendar, Trophy, HardDrive } from "lucide-react";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";

export default async function EditionDashboardPage({
  params,
}: {
  params: Promise<{ slug: string; editionSlug: string }>;
}) {
  const { slug: festivalSlug, editionSlug } = await params;

  // Fetch Festival first to get ID, then Editions. Or use nested query.
  // Using findFestivalBySlugOrId to get festival ID first is reliable.
  const festival = await findFestivalBySlugOrId(festivalSlug);

  if (!festival) notFound();

  const edition = await prisma.edition.findFirst({
    where: {
      festivalId: festival.id,
      slug: editionSlug,
    },
    include: {
      _count: {
        select: { participants: true },
      },
      festival: true,
    },
  });

  if (!edition) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{edition.name}</h1>
        <p className="text-muted-foreground">
          {edition.status} • {format(new Date(edition.startDate), "PPP")} -{" "}
          {format(new Date(edition.endDate), "PPP")}
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
              {edition.participantsCount}
            </div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Judges</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
