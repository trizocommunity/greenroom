import { and, desc, eq } from "drizzle-orm";
import { Crown } from "lucide-react";
import { notFound } from "next/navigation";
import { ParticipantDetailsDialog } from "@/components/festival/pre-event-works/participants/ParticipantDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/core/database/client";
import { participant as participantTable } from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findParticipantByFestivalAndProfileSlug } from "@/features/participants/repositories/participant.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";

const RESERVED_SLUGS = new Set([
  "results",
  "media",
  "news",
  "programmes",
  "sessions",
  "about",
]);

export default async function MyGroupPage({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;
  if (RESERVED_SLUGS.has(participantSlug)) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier as any),
    "publicParticipantProfile",
  );
  if (!canViewProfile) notFound();

  const participant = await findParticipantByFestivalAndProfileSlug(
    festival.id,
    participantSlug,
  );
  if (!participant) notFound();

  // Non-leader pages are public; leaders use /leader routes.
  if (participant.isTeamLeader) notFound();

  const groupId = participant.groupId ?? (participant as any).group?.id;
  if (!groupId) notFound();

  const groupParticipants = await db.query.participant.findMany({
    where: and(
      eq(participantTable.festivalId, festival.id),
      eq(participantTable.groupId, groupId as string),
    ),
    with: {
      group: true,
      category: true,
    },
    orderBy: [desc(participantTable.createdAt)],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Participants</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View every participant in your group and open their profile details.
        </p>
      </div>

      {groupParticipants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No participants in this group.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupParticipants.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{s.name}</span>
                    {s.isTeamLeader && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-800 border-amber-500/30"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3.5 w-3.5" />
                          Team Leader
                        </span>
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.category?.name ?? "—"} · {s.chestNumber ?? "—"}
                  </div>
                </div>

                <ParticipantDetailsDialog
                  festivalId={festival.id}
                  participant={s}
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      View Details
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
