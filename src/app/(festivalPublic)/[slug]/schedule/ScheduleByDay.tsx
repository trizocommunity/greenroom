"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/festival/public/PublicSection";
import { cn } from "@/core/utils/cn";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";

const SESSION_TYPE_LABELS: Record<string, string> = {
  GENERAL: "Session",
  CEREMONY: "Ceremony",
  TALK: "Talk",
  CONCERT: "Concert",
};

export type ScheduleEntry = {
  id: string;
  type: "PROGRAMME" | "SESSION";
  startTime: string;
  endTime: string | null;
  title: string;
  category: string | null;
  sessionType: string | null;
  description: string | null;
  speakers: string | null;
  stage: { id: string; name: string } | null;
};

type Day = {
  dateKey: string;
  tabLabel: string;
  label: string;
  entries: ScheduleEntry[];
};

/**
 * The day's programme as a timeline, not a table. Time runs down the left
 * edge in one column so a visitor can scan for "what's on at four" without
 * reading a single row label — and it collapses to one column on a phone
 * instead of scrolling sideways.
 */
export function ScheduleByDay({
  days,
  accentColor = "var(--primary)",
}: {
  days: Day[];
  accentColor?: string;
}) {
  const [activeDay, setActiveDay] = useState(days[0]?.dateKey ?? "");
  const [activeStageId, setActiveStageId] = useState("");

  const activeData = days.find((d) => d.dateKey === activeDay);

  const stagesForDay = useMemo(() => {
    if (!activeData) return [];
    const seen = new Map<string, { id: string; name: string }>();
    for (const e of activeData.entries) {
      if (e.stage && !seen.has(e.stage.id)) seen.set(e.stage.id, e.stage);
    }
    return Array.from(seen.values());
  }, [activeData]);

  const filteredEntries =
    activeData && activeStageId !== ""
      ? activeData.entries.filter((e) => e.stage?.id === activeStageId)
      : (activeData?.entries ?? []);

  if (days.length === 0) return null;

  return (
    <div>
      {/* Days */}
      {days.length > 1 && (
        <div
          role="tablist"
          aria-label="Festival days"
          className="scrollbar-hide -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
        >
          {days.map(({ dateKey, tabLabel, entries: dayEntries }) => {
            const isActive = activeDay === dateKey;
            return (
              <button
                key={dateKey}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveDay(dateKey);
                  setActiveStageId("");
                }}
                className={cn(
                  "relative shrink-0 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-heading"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tabLabel}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {dayEntries.length}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="schedule-day-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeData && (
        <div role="tabpanel" className="pt-8">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="text-lg font-semibold tracking-tight text-heading">
              {activeData.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredEntries.length} item
              {filteredEntries.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Stage filter */}
          {stagesForDay.length > 0 && (
            <div className="scrollbar-hide -mx-4 mb-8 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <StageChip
                active={activeStageId === ""}
                onClick={() => setActiveStageId("")}
                accentColor={accentColor}
              >
                All stages
              </StageChip>
              {stagesForDay.map((stage) => (
                <StageChip
                  key={stage.id}
                  active={activeStageId === stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  accentColor={accentColor}
                >
                  {stage.name}
                </StageChip>
              ))}
            </div>
          )}

          {filteredEntries.length === 0 ? (
            <EmptyState>Nothing scheduled on this stage.</EmptyState>
          ) : (
            <ol className="divide-y divide-border border-y border-border">
              {filteredEntries.map((entry, i) => (
                <ScheduleRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  accentColor={accentColor}
                />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function StageChip({
  active,
  onClick,
  accentColor,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
      style={active ? { backgroundColor: accentColor } : undefined}
    >
      {children}
    </button>
  );
}

function ScheduleRow({
  entry,
  index,
  accentColor,
}: {
  entry: ScheduleEntry;
  index: number;
  accentColor: string;
}) {
  const start = parseStoredScheduleInstant(entry.startTime);
  const end = entry.endTime ? parseStoredScheduleInstant(entry.endTime) : null;
  const isProgramme = entry.type === "PROGRAMME";
  const typeLabel = isProgramme
    ? "Programme"
    : (SESSION_TYPE_LABELS[entry.sessionType ?? "GENERAL"] ?? "Session");

  const meta = [entry.category, entry.speakers].filter(Boolean) as string[];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.03 }}
      className="grid gap-x-6 gap-y-1.5 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]"
    >
      {/* Time */}
      <div className="flex items-baseline gap-2 sm:block">
        <span className="text-sm font-medium tabular-nums text-heading">
          {format(start, "h:mm a")}
        </span>
        {end && (
          <span className="text-xs tabular-nums text-muted-foreground sm:mt-0.5 sm:block">
            to {format(end, "h:mm a")}
          </span>
        )}
      </div>

      {/* Item */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: isProgramme ? accentColor : "var(--border)",
            }}
          />
          <span className="truncate text-[15px] font-medium text-heading">
            {entry.title}
          </span>
        </div>
        <p className="mt-0.5 pl-3.5 text-xs text-muted-foreground">
          {[typeLabel, ...meta].join(" · ")}
        </p>
        {entry.description && (
          <p className="mt-1 pl-3.5 text-sm leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
        )}
      </div>

      {/* Stage */}
      <span className="pl-3.5 text-xs text-muted-foreground sm:self-start sm:pl-0 sm:pt-0.5 sm:text-right">
        {entry.stage?.name ?? "—"}
      </span>
    </motion.li>
  );
}
