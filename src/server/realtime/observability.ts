import { realtimeConfig } from "@/lib/realtime-config";

type RealtimeLogLevel = "info" | "warn" | "error";

type RealtimeLogInput = {
  scope: string;
  message: string;
  level?: RealtimeLogLevel;
  data?: Record<string, unknown>;
};

function writeLog({ scope, message, level = "info", data }: RealtimeLogInput) {
  if (!realtimeConfig.observabilityEnabled) return;
  const payload = {
    ts: new Date().toISOString(),
    subsystem: "realtime",
    scope,
    message,
    ...data,
  };
  if (level === "error") {
    console.error(payload);
    return;
  }
  if (level === "warn") {
    console.warn(payload);
    return;
  }
  console.info(payload);
}

export const realtimeObservability = {
  eventReceived(scope: string, data?: Record<string, unknown>) {
    writeLog({ scope, message: "event_received", data });
  },
  eventDispatched(scope: string, data?: Record<string, unknown>) {
    writeLog({ scope, message: "event_dispatched", data });
  },
  transportConnected(scope: string, data?: Record<string, unknown>) {
    writeLog({ scope, message: "transport_connected", data });
  },
  transportDisconnected(scope: string, data?: Record<string, unknown>) {
    writeLog({ scope, message: "transport_disconnected", data });
  },
  transportError(scope: string, data?: Record<string, unknown>) {
    writeLog({ scope, message: "transport_error", level: "warn", data });
  },
  dispatchFailure(scope: string, data?: Record<string, unknown>) {
    writeLog({ scope, message: "dispatch_failure", level: "error", data });
  },
  metric(name: string, data?: Record<string, unknown>) {
    writeLog({ scope: "metrics", message: name, data });
  },
};
