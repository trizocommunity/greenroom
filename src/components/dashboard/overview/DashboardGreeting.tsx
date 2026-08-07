"use client";

import { useEffect, useState } from "react";

export function DashboardGreeting({ name }: { name?: string | null }) {
  const [greeting, setGreeting] = useState("Hello");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    setDateStr(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    );
  }, []);

  const displayName = name ? name.split(" ")[0] : "there";

  return (
    <div className="flex flex-col space-y-1 mb-6 mt-2">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        {greeting}, {displayName}! 👋
      </h2>
      <p className="text-sm text-muted-foreground ">
        It&apos;s {dateStr}. Let&apos;s get ready for event day.
      </p>
    </div>
  );
}
