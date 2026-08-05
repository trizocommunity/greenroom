import "client-only";
import { AppError, ERROR_MESSAGES } from "./errors";

export interface HumanizedError {
  title?: string;
  message: string;
}

export type HumanizerRule = {
  match: RegExp | string;
  toMessage: (raw: string) => string | null;
};

const humanizerRules: HumanizerRule[] = [
  {
    match: "scoring policy has no matching grade rule",
    toMessage: () =>
      "Scores were saved, but result mapping failed because the scoring policy does not cover this case yet. Ask an admin to update the scoring policy and submit again.",
  },
  {
    match: "scoring policy has no matching award rule",
    toMessage: () =>
      "Scores were saved, but result mapping failed because the scoring policy does not cover this case yet. Ask an admin to update the scoring policy and submit again.",
  },
];

export function registerHumanizerRule(rule: HumanizerRule): () => void {
  humanizerRules.push(rule);
  return () => {
    const idx = humanizerRules.indexOf(rule);
    if (idx >= 0) humanizerRules.splice(idx, 1);
  };
}

function getMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message ?? "";
  if (typeof err === "object") {
    const anyErr = err as { message?: unknown };
    if (typeof anyErr.message === "string") return anyErr.message;
  }
  return "";
}

function isNetworkLike(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("load failed") ||
    lower.includes("timeout") ||
    lower.includes("aborted") ||
    lower.includes("err_network")
  );
}

function getHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const anyErr = err as Record<string, unknown>;
  if (typeof anyErr.status === "number") return anyErr.status;
  if (typeof anyErr.statusCode === "number") return anyErr.statusCode;
  const response = anyErr.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === "number") return response.status;
  return undefined;
}

function getAppErrorCode(err: unknown): string | undefined {
  if (!(err instanceof AppError)) return undefined;
  if (err.code && err.code !== "APP_ERROR") return err.code;
  return undefined;
}

const HTTP_STATUS_COPY: Record<number, string> = {
  400: "That request was rejected as invalid. Please check your input and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform that action.",
  404: "We couldn't find what you were looking for.",
  409: "That action conflicts with the current state. Refresh and try again.",
  422: "Please check your input and try again.",
  429: "Too many requests in a short time. Please wait a moment and try again.",
  500: "The server hit an unexpected error. Please try again in a moment.",
  502: "The service is temporarily unavailable. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly.",
  504: "The service is taking too long to respond. Please try again shortly.",
};

export function humanizeError(err: unknown): HumanizedError {
  const raw = getMessage(err);
  const status = getHttpStatus(err);

  if (!raw && status == null && !(err instanceof AppError)) {
    return { message: ERROR_MESSAGES.DEFAULT };
  }

  if (raw && isNetworkLike(raw)) {
    return {
      message:
        "We couldn't reach the server. Check your connection and try again.",
    };
  }

  if (status && HTTP_STATUS_COPY[status]) {
    return { message: HTTP_STATUS_COPY[status] };
  }
  if (status && status >= 500) {
    return { message: HTTP_STATUS_COPY[500] };
  }
  if (status && status >= 400) {
    return { message: ERROR_MESSAGES.VALIDATION };
  }

  if (err instanceof AppError) {
    const code = err.code;
    if (code && code !== "APP_ERROR") {
      const known = ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES];
      if (known) return { message: known };
    }
    return { message: err.message || ERROR_MESSAGES.DEFAULT };
  }

  if (raw) {
    const lower = raw.toLowerCase();
    for (const rule of humanizerRules) {
      const test =
        typeof rule.match === "string"
          ? lower.includes(rule.match)
          : rule.match.test(lower);
      if (test) {
        const friendly = rule.toMessage(raw);
        if (friendly) return { message: friendly };
      }
    }
  }

  return { message: ERROR_MESSAGES.DEFAULT };
}