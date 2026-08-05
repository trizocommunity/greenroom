import { describe, expect, it } from "vitest";
import { AppError, ERROR_MESSAGES } from "./errors";
import { humanizeError, registerHumanizerRule } from "./humanize";

describe("humanizeError", () => {
  it("returns the friendly default for null / undefined", () => {
    expect(humanizeError(null).message).toBe(ERROR_MESSAGES.DEFAULT);
    expect(humanizeError(undefined).message).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it("returns ERROR_MESSAGES.DEFAULT for unknown errors", () => {
    expect(humanizeError(new Error("totally raw backend string")).message).toBe(
      ERROR_MESSAGES.DEFAULT,
    );
  });

  it("returns the string as-is only when it cannot be humanized? actually returns DEFAULT per fallback rule", () => {
    const out = humanizeError("raw string");
    expect(out.message).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it("maps known AppError codes via ERROR_MESSAGES", () => {
    const out = humanizeError(
      new AppError(ERROR_MESSAGES.PARTICIPANT_INVALID_DOB, "PARTICIPANT_INVALID_DOB"),
    );
    expect(out.message).toBe(ERROR_MESSAGES.PARTICIPANT_INVALID_DOB);
  });

  it("uses the AppError.message even when code is the default APP_ERROR", () => {
    const out = humanizeError(new AppError("OTP is invalid or expired."));
    expect(out.message).toBe("OTP is invalid or expired.");
  });

  it("recognises network-style failures", () => {
    expect(humanizeError(new Error("Failed to fetch")).message).toMatch(
      /couldn't reach the server/i,
    );
    expect(humanizeError(new Error("NetworkError when attempting to fetch resource")).message).toMatch(
      /couldn't reach the server/i,
    );
    expect(humanizeError(new Error("timeout of 10000ms exceeded")).message).toMatch(
      /couldn't reach the server/i,
    );
  });

  it("maps HTTP 401/403/404/429/500", () => {
    expect(humanizeError({ status: 401 }).message).toMatch(/session/i);
    expect(humanizeError({ status: 403 }).message).toMatch(/permission/i);
    expect(humanizeError({ status: 404 }).message).toMatch(/couldn't find/i);
    expect(humanizeError({ status: 429 }).message).toMatch(/too many/i);
    expect(humanizeError({ status: 500 }).message).toMatch(/unexpected error/i);
    expect(humanizeError({ status: 502 }).message).toMatch(/temporarily unavailable/i);
    expect(humanizeError({ status: 504 }).message).toMatch(/taking too long/i);
  });

  it("reads axios-style nested status", () => {
    expect(humanizeError({ response: { status: 401 } }).message).toMatch(
      /session/i,
    );
  });

  it("falls back for 4xx/5xx without a specific message", () => {
    expect(humanizeError({ status: 418 }).message).toBe(ERROR_MESSAGES.VALIDATION);
    expect(humanizeError({ status: 599 }).message).toBe(HTTP_FALLBACK_500());
  });

  it("translates the seeded scoring-policy rules", () => {
    const out = humanizeError(
      new Error(
        "Scores were saved, but scoring policy has no matching grade rule for category GROUP",
      ),
    );
    expect(out.message).toMatch(/Ask an admin to update the scoring policy/);
  });

  it("supports registerHumanizerRule for new rules", () => {
    const unregister = registerHumanizerRule({
      match: "weird backend thing",
      toMessage: () => "All good, try again.",
    });
    expect(humanizeError(new Error("encountered weird backend thing")).message).toBe(
      "All good, try again.",
    );
    unregister();
    expect(humanizeError(new Error("encountered weird backend thing")).message).toBe(
      ERROR_MESSAGES.DEFAULT,
    );
  });

  it("treats registered rule returning null as a defer", () => {
    registerHumanizerRule({
      match: "defer-me",
      toMessage: () => null,
    });
    expect(humanizeError(new Error("please defer-me now")).message).toBe(
      ERROR_MESSAGES.DEFAULT,
    );
  });
});

function HTTP_FALLBACK_500() {
  return "The server hit an unexpected error. Please try again in a moment.";
}