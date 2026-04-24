"use client";

import { Copy, Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CompactHistoryList } from "@/components/dashboard/event-works/CompactHistoryList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCountdownHms } from "@/lib/format-countdown-hms";
import {
  createProgrammeJudgeLinkAction,
  regenerateProgrammeJudgeLinkAction,
} from "@/server/actions/programme-judging.actions";

type ProgrammeType = "INDIVIDUAL" | "GROUP";

type JudgingAssignmentRow = {
  assignmentId: string;
  teamNumber: number;
  student: { id: string; name: string; chestNumber: string | null } | null;
  group: { id: string; name: string } | null;
  result: {
    id: string;
    points: number;
    grade: string | null;
    position: number | null;
    remarks: string | null;
    isPublished: boolean;
  } | null;
};

type JudgingProgrammeRow = {
  programmeId: string;
  programmeName: string;
  programmeType: ProgrammeType;
  category: { id: string; name: string } | null;
  status: string;
  openJudgeSession: { startedAt: Date } | null;
  latestUsedJudgeSession: {
    startedAt: Date;
    usedAt: Date | null;
    createdBy: string | null;
    submittedByName: string | null;
    submittedByContact: string | null;
    submittedByNote: string | null;
  } | null;
  codeLetters?: { code: string; points: number; grade: string | null }[];
  assignments: JudgingAssignmentRow[];
};

type ProgrammeJudgingBoardStage = {
  stage: { id: string; name: string } | null;
  programmesToJudge: JudgingProgrammeRow[];
};

export function JudgmentClient({
  festival,
  stages,
  festivalStages,
  judgedProgrammes,
}: {
  festival: { id: string; slug: string; tier: string };
  stages: ProgrammeJudgingBoardStage[];
  festivalStages: { id: string; name: string }[];
  judgedProgrammes: JudgingProgrammeRow[];
}) {
  const router = useRouter();
  // Avoid hydration mismatch: don't render a moving timer during SSR/hydration.
  // We only start ticking after mount.
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [judgeLinksByProgrammeId, setJudgeLinksByProgrammeId] = useState<
    Record<string, { judgeUrl: string; startedAt: Date }>
  >({});
  const [activeStageId, setActiveStageId] = useState<string>("__all__");

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hasStartedProgrammes = useMemo(() => {
    return stages.some((s) =>
      s.programmesToJudge.some((p) => p.status === "STARTED"),
    );
  }, [stages]);

  // Polling refresh every 12 seconds when there are active programmes
  useEffect(() => {
    if (!hasStartedProgrammes) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 12000);
    return () => window.clearInterval(id);
  }, [hasStartedProgrammes, router]);

  const stageTabs = useMemo(() => {
    const byStageId = new Map<
      string,
      { id: string; name: string; programmesToJudge: JudgingProgrammeRow[] }
    >();

    for (const s of festivalStages) {
      byStageId.set(s.id, { id: s.id, name: s.name, programmesToJudge: [] });
    }

    for (const s of stages) {
      const stageId = s.stage?.id ?? "__none__";
      const stageName = s.stage?.name ?? "No stage";
      const existing = byStageId.get(stageId);
      if (existing) {
        existing.programmesToJudge = s.programmesToJudge;
      } else {
        byStageId.set(stageId, {
          id: stageId,
          name: stageName,
          programmesToJudge: s.programmesToJudge,
        });
      }
    }

    const tabs = Array.from(byStageId.values());
    return tabs.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [stages, festivalStages]);

  const filteredJudgedProgrammes = useMemo(() => {
    const sorted = [...judgedProgrammes].sort((a, b) => {
      const at = a.latestUsedJudgeSession?.usedAt
        ? new Date(a.latestUsedJudgeSession.usedAt).getTime()
        : 0;
      const bt = b.latestUsedJudgeSession?.usedAt
        ? new Date(b.latestUsedJudgeSession.usedAt).getTime()
        : 0;
      if (bt !== at) return bt - at;
      return a.programmeName.localeCompare(b.programmeName, undefined, {
        sensitivity: "base",
      });
    });
    return sorted;
  }, [judgedProgrammes]);

  const handleCreateJudgeLink = (programmeId: string) => {
    startTransition(async () => {
      const res = await createProgrammeJudgeLinkAction(
        festival.id,
        programmeId,
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setJudgeLinksByProgrammeId((prev) => ({
        ...prev,
        [programmeId]: {
          judgeUrl: res.data.judgeUrl,
          startedAt: new Date(res.data.startedAt),
        },
      }));
      toast.success("Judge link created");
    });
  };

  const handleRegenerateJudgeLink = (programmeId: string) => {
    startTransition(async () => {
      const res = await regenerateProgrammeJudgeLinkAction(
        festival.id,
        programmeId,
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setJudgeLinksByProgrammeId((prev) => ({
        ...prev,
        [programmeId]: {
          judgeUrl: res.data.judgeUrl,
          startedAt: new Date(res.data.startedAt),
        },
      }));
      toast.success("Judge link regenerated");
    });
  };

  const handleCopyJudgeLink = async (programmeId: string) => {
    const url = judgeLinksByProgrammeId[programmeId]?.judgeUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Judge link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareJudgeLinkWhatsApp = (programmeId: string) => {
    const url = judgeLinksByProgrammeId[programmeId]?.judgeUrl;
    if (!url) return;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(url)}`;
    window.open(waUrl, "_blank", "noopener");
  };

  const getElapsedSeconds = (startedAt: Date) => {
    if (nowMs == null) return 0;
    const t = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((nowMs - t) / 1000));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Judgment
          </h1>
          <div className="flex items-center gap-2">
            <Select value={activeStageId} onValueChange={setActiveStageId}>
              <SelectTrigger className="w-[180px] sm:w-[220px]">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All stages</SelectItem>
                {stageTabs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link href={`/dashboard/${festival.slug}/event-works/judges`}>
                Who's judges
              </Link>
            </Button>
          </div>
        </div>

        <div className="min-h-[270px] mt-5">
          {(() => {
            const activeProgrammes =
              activeStageId === "__all__"
                ? stageTabs.flatMap((s) => s.programmesToJudge)
                : (stageTabs.find((s) => s.id === activeStageId)
                    ?.programmesToJudge ?? []);

            if (activeProgrammes.length === 0) {
              const msg =
                activeStageId === "__all__"
                  ? "No STARTED programmes ready for judging yet."
                  : `No STARTED programmes in this stage yet.`;
              return (
                <div className="py-12 text-sm text-muted-foreground text-center">
                  {msg}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeProgrammes.map((p) => {
                    const openTimerStartedAt =
                      judgeLinksByProgrammeId[p.programmeId]?.startedAt ??
                      p.openJudgeSession?.startedAt ??
                      null;
                    const elapsedSeconds =
                      openTimerStartedAt && nowMs != null
                        ? getElapsedSeconds(openTimerStartedAt)
                        : null;

                    const hasOpenJudgeSession = Boolean(
                      p.openJudgeSession?.startedAt,
                    );
                    const hasJudgeLink = Boolean(
                      judgeLinksByProgrammeId[p.programmeId]?.judgeUrl,
                    );

                    return (
                      <Card
                        key={p.programmeId}
                        className="overflow-hidden mt-3 h-full"
                      >
                        <CardHeader className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">
                                {p.programmeName}
                              </CardTitle>
                              <div className="text-xs text-muted-foreground">
                                {p.programmeType === "GROUP"
                                  ? "Group programme"
                                  : "Individual programme"}
                              </div>
                            </div>
                            <div className="flex items-center flex-col">
                              <Badge variant="outline" className="shrink-0">
                                STARTED
                              </Badge>
                              {elapsedSeconds != null ? (
                                <div>
                                  <Badge
                                    className="text-xs"
                                    variant="secondary"
                                  >
                                    {formatCountdownHms(elapsedSeconds)}
                                  </Badge>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() =>
                                  handleCreateJudgeLink(p.programmeId)
                                }
                                disabled={isPending || hasOpenJudgeSession}
                                className="gap-2 w-full"
                              >
                                <Sparkles className="w-4 h-4" />
                                {hasOpenJudgeSession
                                  ? "Judge link active"
                                  : hasJudgeLink
                                    ? "Recreate judge link"
                                    : "Create judge link"}
                              </Button>

                              {hasJudgeLink ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      handleCopyJudgeLink(p.programmeId)
                                    }
                                    disabled={isPending}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      handleShareJudgeLinkWhatsApp(
                                        p.programmeId,
                                      )
                                    }
                                    disabled={isPending}
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                            {(hasOpenJudgeSession || hasJudgeLink) && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  handleRegenerateJudgeLink(p.programmeId)
                                }
                                disabled={isPending}
                                className="w-full"
                              >
                                Regenerate link
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <CompactHistoryList
        title="Judging history"
        count={filteredJudgedProgrammes.length}
        emptyText="History appears here after judges submit points."
        items={filteredJudgedProgrammes.map((p) => {
          const judgedAt = p.latestUsedJudgeSession?.usedAt
            ? new Date(p.latestUsedJudgeSession.usedAt).toLocaleString()
            : "Judged time unavailable";
          const judgeLabel =
            p.latestUsedJudgeSession?.submittedByName ??
            p.latestUsedJudgeSession?.createdBy ??
            "External judge";
          const extraInfo = [
            p.latestUsedJudgeSession?.submittedByContact,
            p.latestUsedJudgeSession?.submittedByNote,
          ]
            .filter(Boolean)
            .join(" | ");
          return {
            id: p.programmeId,
            title: p.programmeName,
            metaPrimary: judgedAt,
            metaSecondary: `Judge: ${judgeLabel}`,
            metaSecondaryTitle: extraInfo || undefined,
          };
        })}
      />
    </div>
  );
}
