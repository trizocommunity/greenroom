"use client";

import { useEffect, useState } from "react";

function LiveClock({ timezone }: { timezone?: string | null }) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return null;

  return (
    <div className="hidden sm:flex flex-col items-end justify-center bg-card border border-border/60 rounded-xl px-4 py-2 shadow-sm">
      <div className="text-2xl font-bold tracking-tighter text-foreground tabular-nums">
        {time.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: timezone || undefined,
        })}
      </div>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        {time
          .toLocaleTimeString("en-US", {
            timeZoneName: "short",
            timeZone: timezone || undefined,
          })
          .split(" ")
          .slice(2)
          .join(" ")}
      </div>
    </div>
  );
}

export function DashboardGreeting({
  name,
  timezone,
}: {
  name?: string | null;
  timezone?: string | null;
}) {
  const [greeting, setGreeting] = useState("Hello");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone || undefined,
    });
    const hour = parseInt(hourFormatter.format(now), 10);

    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    setDateStr(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: timezone || undefined,
      }).format(now),
    );
  }, [timezone]);

  const displayName = name ? name.split(" ")[0] : "there";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-2">
      <div className="flex flex-col space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {greeting}, {displayName}! 👋
        </h2>
        <p className="text-sm text-muted-foreground ">
          It&apos;s {dateStr}. Let&apos;s get ready for event day.
        </p>
      </div>
      <LiveClock timezone={timezone} />
    </div>
  );
}
