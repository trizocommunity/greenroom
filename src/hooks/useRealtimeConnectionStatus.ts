"use client";

import { useMemo } from "react";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

export function useRealtimeConnectionStatus(enabled = true) {
  const { status, transport } = useRealtimeChannel({
    roomKeys: [],
    enabled,
  });

  return useMemo(
    () => ({
      status,
      transport,
      isConnected: status === "connected",
      isDegraded: status === "degraded",
      isReconnecting: status === "reconnecting",
    }),
    [status, transport],
  );
}
