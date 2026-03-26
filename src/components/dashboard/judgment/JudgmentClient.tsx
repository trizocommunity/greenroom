"use client";

import { Copy, Share2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCountdownHms } from "@/lib/format-countdown-hms";
import { createProgrammeJudgeLinkAction } from "@/server/actions/programme-judging.actions";
import { bulkPublishProgrammeResults } from "@/server/actions/results";

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
  judgedProgrammes,
  canPublish,
}: {
  festival: { id: string; slug: string; tier: string };
  stages: ProgrammeJudgingBoardStage[];
  judgedProgrammes: JudgingProgrammeRow[];
  canPublish: boolean;
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
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    if (!hasStartedProgrammes) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 7000);
    return () => window.clearInterval(id);
  }, [hasStartedProgrammes, router]);

  const stageTabs = useMemo(() => {
    const tabs = stages.map((s) => ({
      id: s.stage?.id ?? "__none__",
      name: s.stage?.name ?? "No stage",
      programmesToJudge: s.programmesToJudge,
    }));
    return tabs.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [stages]);

  const filteredJudgedProgrammes = useMemo(() => {
    if (!search.trim()) return judgedProgrammes;
    const q = search.trim().toLowerCase();
    return judgedProgrammes.filter((p) =>
      p.programmeName.toLowerCase().includes(q),
    );
  }, [judgedProgrammes, search]);

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

  const publishProgramme = async (programmeId: string, publish: boolean) => {
    startTransition(async () => {
      const res = await bulkPublishProgrammeResults(
        programmeId,
        publish,
        festival.slug,
      );
      if (!res.success) {
        toast.error("Failed to update programme publish state");
        return;
      }
      toast.success(publish ? "Results published" : "Results unpublished");
      router.refresh();
    });
  };

  const getElapsedSeconds = (startedAt: Date) => {
    if (nowMs == null) return 0;
    const t = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((nowMs - t) / 1000));
  };

  const teamKeyForProgramme = (
    p: JudgingProgrammeRow,
    a: JudgingAssignmentRow,
  ) => {
    if (p.programmeType === "GROUP") {
      const gid = a.group?.id ?? "__nogroup__";
      const tn = a.teamNumber ?? 1;
      return `${gid}:${tn}`;
    }
    return a.assignmentId;
  };

  const renderAssignmentsTable = (p: JudgingProgrammeRow) => {
    if (p.programmeType === "INDIVIDUAL") {
      const rows = p.assignments
        .filter((a) => a.result?.points != null)
        .map((a) => a);
      return (
        <div className="space-y-2">
          {rows.map((a) => (
            <div
              key={a.assignmentId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {a.student?.name ?? "Unknown"}
                </div>
                <div className="text-xs text-muted-foreground">
                  #{a.student?.chestNumber ?? "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold">
                  {a.result?.points ?? 0} pts
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.result?.grade ?? "—"} · #{a.result?.position ?? "—"}
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No points yet.</p>
          ) : null}
        </div>
      );
    }

    // GROUP: de-duplicate by team key and show one row per team.
    const byTeam = new Map<
      string,
      {
        teamNumber: number;
        groupName: string;
        points: number;
        grade: string | null;
        position: number | null;
        remarks: string | null;
      }
    >();

    for (const a of p.assignments) {
      const key = teamKeyForProgramme(p, a);
      if (byTeam.has(key)) continue;
      const points = a.result?.points ?? 0;
      byTeam.set(key, {
        teamNumber: a.teamNumber ?? 1,
        groupName: a.group?.name ?? "Unknown group",
        points,
        grade: a.result?.grade ?? null,
        position: a.result?.position ?? null,
        remarks: a.result?.remarks ?? null,
      });
    }

    const rows = Array.from(byTeam.values()).sort(
      (x, y) => (x.position ?? 999) - (y.position ?? 999),
    );

    return (
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={`${r.groupName}:${r.teamNumber}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{r.groupName}</div>
              <div className="text-xs text-muted-foreground">
                Team {r.teamNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-semibold">{r.points} pts</div>
              <div className="text-xs text-muted-foreground">
                {r.grade ?? "—"} · #{r.position ?? "—"}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No points yet.</p>
        ) : null}
      </div>
    );
  };

  const renderJudgedCodeLettersCompact = (p: JudgingProgrammeRow) => {
    const rows = p.codeLetters ?? [];
    if (rows.length === 0) {
      return (
        <p className="text-xs text-muted-foreground">
          No code letters available yet.
        </p>
      );
    }

    return (
      <div className="space-y-1">
        {rows.map((cl) => (
          <div
            key={cl.code}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0">
              <div className="font-mono font-semibold truncate">{cl.code}</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-semibold tabular-nums">
                {cl.points} pts
              </div>
              <div className="text-xs text-muted-foreground">
                {cl.grade ?? "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Judgment
            </h1>
          <div className="w-full sm:w-80">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search judged programmes..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeStageId} onValueChange={setActiveStageId}>
        <TabsList className="flex flex-wrap gap-2 justify-start">
          {stageTabs.length === 0 ? null : (
            <TabsTrigger value="__all__">All stages</TabsTrigger>
          )}
          {stageTabs.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeStageId}>
          <div className="min-h-[270px]">
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
                  <div className="overflow-x-auto">
                  <div
                      className="flex gap-4 min-w-max pb-2 cursor-grab active:cursor-grabbing select-none"
                    role="application"
                      onMouseDown={(e) => {
                        const el = e.currentTarget;
                        const isButtonTarget =
                          e.target instanceof HTMLElement &&
                          (e.target.closest("button") ||
                            e.target.closest("a") ||
                            e.target.closest('[role="button"]'));
                        if (isButtonTarget) return;
                        const startX = e.clientX;
                        const startScrollLeft = el.scrollLeft;
                        const onMove = (ev: MouseEvent) => {
                          const dx = ev.clientX - startX;
                          el.scrollLeft = startScrollLeft - dx;
                        };
                        const onUp = () => {
                          window.removeEventListener("mousemove", onMove);
                          window.removeEventListener("mouseup", onUp);
                        };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                    >
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
                <Card key={p.programmeId} className="overflow-hidden">
                  <CardHeader className="p-4">
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">
                          STARTED
                        </Badge>
                      </div>
                    </div>
                    {elapsedSeconds != null ? (
                      <div className="mt-2">
                        <Badge
                          variant="secondary"
                          className="w-full justify-start gap-2 font-mono"
                        >
                          Timer: {formatCountdownHms(elapsedSeconds)}
                        </Badge>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleCreateJudgeLink(p.programmeId)}
                        disabled={isPending || hasOpenJudgeSession}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {hasOpenJudgeSession
                          ? "Judge link active"
                          : hasJudgeLink
                            ? "Recreate judge link"
                            : "Create judge link"}
                      </Button>

                      {hasJudgeLink ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleCopyJudgeLink(p.programmeId)}
                            disabled={isPending}
                            className="gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleShareJudgeLinkWhatsApp(p.programmeId)
                            }
                            disabled={isPending}
                            className="gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                            WhatsApp
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Judged programmes (ready to publish)
          </h2>
          <Badge variant="secondary">
            {filteredJudgedProgrammes.length} programmes
          </Badge>
        </div>

        {filteredJudgedProgrammes.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Judges will appear here after they submit points.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredJudgedProgrammes.map((p) => {
              const publishState = p.status === "PUBLISHED";
              return (
                <Card key={p.programmeId} className="overflow-hidden">
                  <CardHeader className="p-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">
                          {p.programmeName}
                        </CardTitle>
                      </div>
                      <Badge
                        variant={publishState ? "default" : "outline"}
                        className="shrink-0 text-[11px]"
                      >
                        {publishState ? "PUBLISHED" : "ENDED"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className="space-y-2">
                      {renderJudgedCodeLettersCompact(p)}
                      {canPublish ? (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            className="w-full gap-2"
                            onClick={() =>
                              publishProgramme(p.programmeId, !publishState)
                            }
                            disabled={isPending}
                            variant={publishState ? "outline" : "default"}
                          >
                            {publishState
                              ? "Unpublish to edit"
                              : "Publish results"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
