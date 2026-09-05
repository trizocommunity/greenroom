"use client";

import { Clock } from "lucide-react";
import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { compareCodeLetters } from "@/features/programmes/services/scratch-code-plan";
import { formatElapsedClock, toEpochMs } from "./judgement-time";
import type { JudgedProgrammeCard } from "./types";
import { judgementStatusLabel } from "./types";

/**
 * Drawer opened from a "Completed judgements" row. Shows score matrix, a
 * stats strip, and a duration pill so the manager can see how long the round
 * actually took without scrolling through the timeline.
 *
 * No max-height: the parent layout decides sizing; this drawer just flows
 * naturally so the matrix table doesn't get cramped on tablet widths.
 */
export function CompletedJudgementDrawer({
  detail,
  onClose,
  formatCardDateTime,
}: {
  detail: JudgedProgrammeCard | null;
  onClose: () => void;
  formatCardDateTime: (v: string | Date) => string;
}) {
  const sortedRows = useMemo(() => {
    if (!detail) return [];
    return [...detail.codeLetterRows].sort((a, b) =>
      compareCodeLetters(a.code, b.code),
    );
  }, [detail]);

  const durationLabel = useMemo(() => {
    if (!detail) return null;
    const startMs = toEpochMs(detail.createdAt);
    const endMs = detail.judges
      .map((j) => toEpochMs(j.submittedAt))
      .reduce((max, n) => (n > max ? n : max), 0);
    if (!startMs || !endMs || endMs <= startMs) return null;
    return formatElapsedClock(startMs, endMs);
  }, [detail]);

  const timeline = useMemo(() => {
    if (!detail) return [];
    const events: Array<{ at: number; title: string; detail: string }> = [
      {
        at: toEpochMs(detail.createdAt),
        title: "Configuration created",
        detail: `Mode ${detail.judgingMode} • ${detail.requiredCodeLetters} code letters`,
      },
    ];
    for (const judge of detail.judges) {
      if (judge.firstScoredAt) {
        events.push({
          at: toEpochMs(judge.firstScoredAt),
          title: `${judge.name} started scoring`,
          detail: formatCardDateTime(judge.firstScoredAt),
        });
      }
      if (judge.submittedAt) {
        events.push({
          at: toEpochMs(judge.submittedAt),
          title: `${judge.name} submitted`,
          detail: formatCardDateTime(judge.submittedAt),
        });
      } else {
        events.push({
          at: toEpochMs(detail.createdAt),
          title: `${judge.name} pending`,
          detail: "No submission recorded",
        });
      }
    }
    events.push({
      at: toEpochMs(detail.createdAt) + 1,
      title: "Judgement completion",
      detail: detail.completionSummary,
    });
    return events.sort((a, b) => a.at - b.at);
  }, [detail, formatCardDateTime]);

  return (
    <Drawer
      open={Boolean(detail)}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DrawerContent className="w-full ">
        <DrawerHeader>
          <DrawerTitle>{detail?.programmeName}</DrawerTitle>
          <DrawerDescription>
            Status {detail?.programmeStatus} · Mode {detail?.judgingMode} ·{" "}
            {detail?.totalJudgements} score entries
          </DrawerDescription>
        </DrawerHeader>

        {detail ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-6 pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {judgementStatusLabel(detail.judgementStatus)}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {detail.judgingMode}
                </Badge>
                {durationLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple/40 bg-purple/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple">
                    <Clock className="h-3 w-3" aria-hidden />
                    {durationLabel}
                  </span>
                ) : null}
              </div>

              <ReviewScores
                detail={detail}
                sortedRows={sortedRows}
                formatCardDateTime={formatCardDateTime}
              />

              <Separator />

              <ViewDetails
                detail={detail}
                durationLabel={durationLabel}
                timeline={timeline}
              />
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function ReviewScores({
  detail,
  sortedRows,
  formatCardDateTime,
}: {
  detail: JudgedProgrammeCard;
  sortedRows: JudgedProgrammeCard["codeLetterRows"];
  formatCardDateTime: (v: string | Date) => string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold tracking-tight text-lg">Review Scores</h3>
      <div className="rounded-md border p-2.5 sm:p-3">
        <p className="text-xs font-medium mb-2">Judge submissions</p>
        <div className="flex flex-wrap gap-2">
          {detail.judges.map((j) => (
            <span key={j.id} className="text-xs rounded-md bg-muted px-2 py-1">
              {j.name}
              {j.submittedAt
                ? ` · ${formatCardDateTime(j.submittedAt)}`
                : " · not submitted"}
            </span>
          ))}
        </div>
      </div>
      {detail.judgingMode === "SINGLE" ? (
        <div className="rounded-md border p-2.5 sm:p-3">
          <p className="mb-2 text-xs font-medium">Single-mode completion</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {detail.judgeProgress.map((progress) => (
              <div
                key={progress.judgeId}
                className="rounded-md border bg-muted/20 px-2.5 py-2 text-xs"
              >
                <p className="font-medium">{progress.judgeName}</p>
                <p className="text-muted-foreground">
                  {progress.scoredCount}/{progress.requiredCount} code letters
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              {detail.judges.map((j) => (
                <th
                  key={j.id}
                  className="px-3 py-2 text-left whitespace-nowrap"
                >
                  {j.name}
                </th>
              ))}
              <th className="px-3 py-2 text-left">Average</th>
              <th className="px-3 py-2 text-left">Grade</th>
              <th className="px-3 py-2 text-left">Award Pts</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.codeLetterId}
                className={`border-t ${row.isAbsent ? "opacity-50" : ""}`}
              >
                <td className="px-3 py-2 font-mono">
                  {row.code}
                  {row.isAbsent && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      Absent
                    </Badge>
                  )}
                </td>
                {detail.judges.map((j) => (
                  <td key={j.id} className="px-3 py-2">
                    {row.isAbsent ? "—" : (row.judgeScores[j.id] ?? "—")}
                  </td>
                ))}
                <td className="px-3 py-2 font-semibold">
                  {row.isAbsent ? "—" : row.average.toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  {row.isAbsent ? "—" : (row.grade ?? "—")}
                </td>
                <td className="px-3 py-2">
                  {row.isAbsent ? "—" : (row.awardPoints ?? "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Local helper to keep the table cell text formatting in one place. The
// formatter is plumbed through from the parent to honour the user's tz.

function ViewDetails({
  detail,
  durationLabel,
  timeline,
}: {
  detail: JudgedProgrammeCard;
  durationLabel: string | null;
  timeline: Array<{ at: number; title: string; detail: string }>;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold tracking-tight text-lg">View Details</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat
          label="Status"
          value={judgementStatusLabel(detail.judgementStatus)}
        />
        <Stat label="Mode" value={detail.judgingMode} />
        <Stat label="Entries" value={String(detail.totalJudgements)} />
        <Stat label="Code letters" value={String(detail.requiredCodeLetters)} />
        <Stat label="Duration" value={durationLabel ?? "—"} highlight />
      </div>

      <div className="rounded-lg border bg-card/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Timeline
          </p>
          <Badge variant="outline" className="h-5 text-[10px]">
            {timeline.length} events
          </Badge>
        </div>
        <Accordion
          type="single"
          collapsible
          className="mt-2 rounded-md border border-border/70 bg-background/70 px-2.5"
        >
          <AccordionItem value="judgement-timeline" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex min-w-0 items-center gap-2 text-left">
                <span className="truncate text-[11px] font-semibold sm:text-[12px]">
                  Timeline events
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {timeline.length} total
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {timeline.map((event, index) => (
                  <div
                    key={`${event.title}-${index}`}
                    className="rounded-md border border-border/70 bg-linear-to-br from-background via-background to-muted/30 px-2.5 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-purple/40 bg-purple/10 text-[9px] font-semibold text-purple">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold sm:text-[12px]">
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {event.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-2.5 py-2 text-center ${
        highlight ? "border-purple/40 bg-purple/[0.08]" : "bg-muted/20"
      }`}
    >
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p
        className={`text-xs font-semibold ${
          highlight ? "font-mono tabular-nums text-purple" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
