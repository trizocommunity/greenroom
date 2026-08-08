import { toast as sonner } from "sonner";
import { humanizeError } from "@/core/errors/humanize";

type SonnerExternalToast = Parameters<typeof sonner.error>[1];

const sonnerError = sonner.error.bind(sonner);
const sonnerSuccess = sonner.success.bind(sonner);
const sonnerInfo = sonner.info.bind(sonner);
const sonnerWarning = sonner.warning.bind(sonner);
const sonnerMessage = sonner.message?.bind(sonner);
const sonnerLoading = sonner.loading?.bind(sonner);
const sonnerCustom = sonner.custom?.bind(sonner);
const sonnerDismiss = sonner.dismiss?.bind(sonner);
const sonnerPromise = sonner.promise?.bind(sonner);

function humanize(input: unknown): string {
  if (input == null) return "An unexpected error occurred. Please try again.";
  if (typeof input === "string") return humanizeError(input).message;
  return humanizeError(input).message;
}

function isReactNodeLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.$$typeof === "symbol") return true;
  if (typeof v.type === "string" || typeof v.type === "function") return true;
  if (v.props !== undefined) return true;
  return false;
}

function humanizedError(input: unknown, opts?: SonnerExternalToast) {
  if (isReactNodeLike(input)) {
    return sonnerError(input as never, opts as never);
  }
  return sonnerError(humanize(input), opts as never);
}

const proxiedToast = Object.assign(
  function proxiedToast(
    message: unknown,
    opts?: SonnerExternalToast,
  ): string | number {
    if (isReactNodeLike(message)) {
      return (
        sonner as unknown as (
          m: unknown,
          o?: SonnerExternalToast,
        ) => string | number
      )(message, opts);
    }
    if (typeof message === "string") {
      return (
        sonner as unknown as (
          m: string,
          o?: SonnerExternalToast,
        ) => string | number
      )(message, opts);
    }
    return (
      sonner as unknown as (
        m: string,
        o?: SonnerExternalToast,
      ) => string | number
    )(humanize(message), opts);
  },
  {
    error: humanizedError,
    success: (m: unknown, o?: SonnerExternalToast) =>
      isReactNodeLike(m)
        ? sonnerSuccess(m as never, o as never)
        : sonnerSuccess(
            typeof m === "string" ? m : String(m ?? ""),
            o as never,
          ),
    info: (m: unknown, o?: SonnerExternalToast) =>
      isReactNodeLike(m)
        ? sonnerInfo(m as never, o as never)
        : sonnerInfo(typeof m === "string" ? m : String(m ?? ""), o as never),
    warning: (m: unknown, o?: SonnerExternalToast) =>
      isReactNodeLike(m)
        ? sonnerWarning(m as never, o as never)
        : sonnerWarning(
            typeof m === "string" ? m : String(m ?? ""),
            o as never,
          ),
    message: sonnerMessage,
    loading: sonnerLoading,
    custom: sonnerCustom,
    dismiss: sonnerDismiss,
    promise: sonnerPromise,
  },
);

export const toast = proxiedToast;

export type { ExternalToast } from "sonner";
