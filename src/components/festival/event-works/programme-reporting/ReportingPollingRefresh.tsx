"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 10-second `router.refresh()` tick. Keeps the queue and the open
 * workspace in sync without WebSocket plumbing. Renders nothing.
 */
export function ReportingPollingRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 10000);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
