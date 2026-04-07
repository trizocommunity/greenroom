"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { realtimeConfig } from "@/lib/realtime-config";

type ChannelStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "degraded";

type UseRealtimeChannelOptions = {
  roomKeys: string[];
  onEvent?: (payload: Record<string, unknown>) => void;
  enabled?: boolean;
};

let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (sharedSocket) return sharedSocket;
  sharedSocket = io({
    path: "/api/realtime/socket",
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: false,
  });
  return sharedSocket;
}

export function useRealtimeChannel({
  roomKeys,
  onEvent,
  enabled = true,
}: UseRealtimeChannelOptions) {
  const [status, setStatus] = useState<ChannelStatus>("idle");
  const [transport, setTransport] = useState<"socket" | "sse">("sse");
  const [forceSse, setForceSse] = useState(false);
  const callbackRef = useRef(onEvent);
  const sseRetryRef = useRef(0);
  const previousSocketRoomsRef = useRef<string[]>([]);
  callbackRef.current = onEvent;

  const normalizedRooms = useMemo(
    () => roomKeys.filter(Boolean).sort(),
    [roomKeys],
  );

  useEffect(() => {
    if (!enabled) return;

    if (
      realtimeConfig.preferSocketTransport &&
      realtimeConfig.socketEnabled &&
      !forceSse
    ) {
      setTransport("socket");
      const socket = getSocket();
      setStatus("connecting");
      const onConnect = () => {
        setStatus("connected");
        for (const room of previousSocketRoomsRef.current) {
          if (!normalizedRooms.includes(room)) {
            socket.emit("realtime:leave", room);
          }
        }
        for (const room of normalizedRooms) {
          socket.emit("realtime:join", room);
        }
        previousSocketRoomsRef.current = normalizedRooms;
      };
      const onDisconnect = () => setStatus("reconnecting");
      const onError = () => {
        setStatus("degraded");
        setForceSse(true);
      };
      const onEventMessage = (payload: Record<string, unknown>) =>
        callbackRef.current?.(payload);

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("connect_error", onError);
      socket.on("realtime:event", onEventMessage);

      socket.connect();

      if (socket.connected) {
        for (const room of previousSocketRoomsRef.current) {
          if (!normalizedRooms.includes(room)) {
            socket.emit("realtime:leave", room);
          }
        }
        for (const room of normalizedRooms) {
          socket.emit("realtime:join", room);
        }
        previousSocketRoomsRef.current = normalizedRooms;
      }

      return () => {
        for (const room of normalizedRooms) {
          socket.emit("realtime:leave", room);
        }
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onError);
        socket.off("realtime:event", onEventMessage);
      };
    }

    setTransport("sse");
    setStatus((prev) => (prev === "connected" ? "reconnecting" : "connecting"));
    const params = new URLSearchParams();
    if (normalizedRooms.length > 0) {
      params.set("rooms", normalizedRooms.join(","));
    }
    const streamUrl = `/api/realtime/notifications?${params.toString()}`;
    const es = new EventSource(streamUrl);
    es.onopen = () => {
      sseRetryRef.current = 0;
      setStatus("connected");
    };
    es.onmessage = (event) => {
      try {
        callbackRef.current?.(
          JSON.parse(event.data) as Record<string, unknown>,
        );
      } catch {
        // Keep stream alive if payload parsing fails.
      }
    };
    es.onerror = () => {
      setStatus("reconnecting");
      sseRetryRef.current += 1;
      if (sseRetryRef.current > 8) {
        setStatus("degraded");
      }
    };
    return () => {
      es.close();
    };
  }, [enabled, normalizedRooms]);

  return { status, transport };
}
