import { and, desc, eq, isNotNull } from "drizzle-orm";
import { ChevronLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  programmeJudgeSession as judgeSessionTable,
} from "@/core/database/schema";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";

type JudgeProgrammeItem = {
  programmeId: string;
  programmeName: string;
  categoryName: string;
  stageName: string;
  judgedAt: string;
};

type JudgeGroup = {
  judgeKey: string;
  judgeName: string;
  judgeContact: string | null;
  judgmentsCount: number;
  programmes: JudgeProgrammeItem[];
};

export default async function JudgesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { id: true, slug: true, name: true, tier: true },
  });
  if (!festival) return notFound();

  const tier = (festival.tier ?? "STANDARD") as any;
  const canUseJudging = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.judgmentUI",
  );
  if (!canUseJudging) return notFound();

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  if (!context) return notFound();
  if (
    !["OWNER", "ADMIN", "STAGE_MANAGER", "SUPER_ADMIN"].includes(context.role)
  )
    return notFound();

  const usedJudgeSessions = await db.query.programmeJudgeSession.findMany({
    where: and(
      eq(judgeSessionTable.festivalId, festival.id),
      isNotNull(judgeSessionTable.usedAt),
    ),
    with: {
      programme: {
        with: {
          category: { columns: { name: true } },
        },
        columns: { name: true },
      },
      programmeReportingSession: {
        with: {
          stage: { columns: { name: true } },
        },
      },
    },
    orderBy: [desc(judgeSessionTable.usedAt)],
  });

  const grouped = new Map<string, JudgeGroup>();
  for (const s of usedJudgeSessions) {
    if (!s.usedAt) continue;
    const judgeName =
      (s.submittedByName ?? "").trim() ||
      (s.createdBy ?? "").trim() ||
      "External judge";
    const judgeContact = s.submittedByContact ?? null;
    const judgeKey = `${judgeName.toLowerCase()}||${(judgeContact ?? "").toLowerCase()}`;

    const existing = grouped.get(judgeKey);
    const programme: JudgeProgrammeItem = {
      programmeId: s.programmeId,
      programmeName: s.programme.name,
      categoryName: (s.programme as any).category?.name ?? "—",
      stageName:
        (s.programmeReportingSession as any)?.stage?.name ?? "No stage",
      judgedAt: s.usedAt,
    };

    if (!existing) {
      grouped.set(judgeKey, {
        judgeKey,
        judgeName,
        judgeContact,
        judgmentsCount: 1,
        programmes: [programme],
      });
    } else {
      existing.judgmentsCount += 1;
      existing.programmes.push(programme);
    }
  }

  const judgeRows = Array.from(grouped.values()).sort(
    (a, b) => b.judgmentsCount - a.judgmentsCount,
  );

  return (
    <div className="space-y-4 pt-4 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Judges</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/${festival.slug}/event-works/judgment`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Judgment
          </Link>
        </Button>
      </div>

      {judgeRows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No judged submissions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {judgeRows.map((j) => (
            <Card key={j.judgeKey}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{j.judgeName}</span>
                    </div>
                    {j.judgeContact ? (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {j.judgeContact}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="secondary">{j.judgmentsCount} judged</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    View judged programmes
                  </summary>
                  <div className="mt-2 space-y-2">
                    {j.programmes.map((p, idx) => (
                      <div
                        key={`${p.programmeId}-${idx}`}
                        className="rounded-md border bg-muted/20 px-3 py-2"
                      >
                        <div className="text-sm font-medium">
                          {p.programmeName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Category: {p.categoryName} · Stage: {p.stageName} ·
                          Judged: {new Date(p.judgedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
