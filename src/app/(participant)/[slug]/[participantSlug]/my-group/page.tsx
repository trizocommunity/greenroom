import { and, desc, eq } from "drizzle-orm";
import { Crown } from "lucide-react";
import { notFound } from "next/navigation";
import {
  APP_CONTAINER,
  AppEmptyState,
  AppPageHeader,
  StatusPill,
} from "@/components/app/AppSection";
import { ParticipantDetailsDialog } from "@/components/festival/pre-event-works/participants/ParticipantDetailsDialog";
import { Button } from "@/components/ui/button";
import { db } from "@/core/database/client";
import { participant as participantTable } from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findParticipantByFestivalAndProfileSlug } from "@/features/participants/repositories/participant.repository";
import { isEnabled } from "@/features/plan-features/services/feature-gate";

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

  const canViewProfile = isEnabled(festival.tier, "publicParticipantProfile");
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
    <div className={`${APP_CONTAINER} space-y-6 py-8`}>
      <AppPageHeader
        eyebrow={participant.group?.name ?? "Your group"}
        title="Participants"
        description="Everyone in your group, with their category and chest number."
      />

      {groupParticipants.length === 0 ? (
        <AppEmptyState
          title="No participants yet"
          description="Nobody has been added to this group."
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {groupParticipants.map((s: any) => (
            <li key={s.id} className="flex items-center gap-4 py-3.5">
              <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {s.chestNumber ?? "—"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium text-heading">
                    {s.name}
                  </span>
                  {s.isTeamLeader && (
                    <StatusPill tone="warning" icon={Crown}>
                      Leader
                    </StatusPill>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.category?.name ?? "No category"}
                </p>
              </div>

              <ParticipantDetailsDialog
                festivalId={festival.id}
                participant={s}
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Details
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
