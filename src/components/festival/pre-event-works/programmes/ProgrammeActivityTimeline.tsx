"use client";

import { format, isToday, isYesterday } from "date-fns";
import {
  CheckCircle2,
  Hash,
  History,
  Megaphone,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/core/utils/cn";

export interface ProgrammeActivityEntry {
  at: string;
  action: string;
  actorName: string;
  actorEmail: string | null;
  targetType: string;
  targetId: string;
}

interface ActionPresentation {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: "blue" | "amber" | "red" | "green" | "purple" | "slate";
}

const TONE_CLASSES: Record<ActionPresentation["tone"], string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  slate: "bg-muted text-muted-foreground",
};

const ACTION_PRESENTATION: Record<string, ActionPresentation> = {
  CREATE_PROGRAMME: { label: "Programme created", icon: Plus, tone: "blue" },
  UPDATE_PROGRAMME: {
    label: "Programme updated",
    icon: Pencil,
    tone: "amber",
  },
  DELETE_PROGRAMME: {
    label: "Programme deleted",
    icon: Trash2,
    tone: "red",
  },
  ASSIGN_PARTICIPANTS: {
    label: "Participants assigned",
    icon: UserPlus,
    tone: "blue",
  },
  REMOVE_ASSIGNMENT: {
    label: "Assignment removed",
    icon: UserMinus,
    tone: "red",
  },
  APPOINT_TEAM_LEAD: {
    label: "Team lead appointed",
    icon: ShieldCheck,
    tone: "purple",
  },
  REPLACE_TEAM_LEAD: {
    label: "Team lead replaced",
    icon: ShieldCheck,
    tone: "purple",
  },
  REMOVE_TEAM_LEAD: {
    label: "Team lead removed",
    icon: UserMinus,
    tone: "purple",
  },
  OPEN_REPORTING: {
    label: "Reporting opened",
    icon: CheckCircle2,
    tone: "green",
  },
  CLOSE_REPORTING: {
    label: "Reporting closed",
    icon: CheckCircle2,
    tone: "slate",
  },
  MARK_REPORTED: {
    label: "Marked reported",
    icon: CheckCircle2,
    tone: "green",
  },
  ISSUE_CODE_LETTER: {
    label: "Code letters issued",
    icon: Hash,
    tone: "blue",
  },
  SUBMIT_JUDGE_SCORES: {
    label: "Judge scores submitted",
    icon: Users,
    tone: "amber",
  },
  SAVE_RESULT: { label: "Result saved", icon: Save, tone: "blue" },
  PUBLISH_RESULTS: {
    label: "Results published",
    icon: Megaphone,
    tone: "green",
  },
  ANNOUNCE_RESULTS: {
    label: "Results announced",
    icon: Megaphone,
    tone: "green",
  },
};

const DEFAULT_PRESENTATION: ActionPresentation = {
  label: "Activity",
  icon: History,
  tone: "slate",
};

function presentAction(action: string): ActionPresentation {
  return (
    ACTION_PRESENTATION[action] ?? { ...DEFAULT_PRESENTATION, label: action }
  );
}

function dayHeading(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

function groupByDay(entries: ProgrammeActivityEntry[]) {
  const groups: { heading: string; items: ProgrammeActivityEntry[] }[] = [];
  for (const entry of entries) {
    const heading = dayHeading(new Date(entry.at));
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) {
      last.items.push(entry);
    } else {
      groups.push({ heading, items: [entry] });
    }
  }
  return groups;
}

interface ProgrammeActivityTimelineProps {
  entries: ProgrammeActivityEntry[];
  isLoading?: boolean;
  className?: string;
  scrollClassName?: string;
}

export function ProgrammeActivityTimeline({
  entries,
  isLoading,
  className,
  scrollClassName = "max-h-64 sm:max-h-96",
}: ProgrammeActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-3 p-3", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 py-8 text-center",
          className,
        )}
      >
        <History className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  const groups = groupByDay(entries);

  return (
    <ScrollArea className={cn(scrollClassName, className)}>
      <div className="space-y-5 pr-3">
        {groups.map((group) => (
          <div key={group.heading} className="space-y-3">
            <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              {group.heading}
            </div>
            <ol className="relative space-y-4 border-l border-border/60 pl-4 sm:space-y-5">
              {group.items.map((entry, idx) => {
                const { label, icon: Icon, tone } = presentAction(entry.action);
                return (
                  <li
                    key={`${entry.targetId}-${entry.at}-${idx}`}
                    className="relative"
                  >
                    <span
                      className={cn(
                        "absolute -left-[21px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background sm:h-7 sm:w-7",
                        TONE_CLASSES[tone],
                      )}
                    >
                      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </span>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium sm:text-sm">
                          {label}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                          {entry.actorName}
                          {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
                        </p>
                      </div>
                      <time
                        dateTime={entry.at}
                        className="shrink-0 text-[10px] text-muted-foreground sm:text-xs"
                      >
                        {format(new Date(entry.at), "h:mm a")}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
