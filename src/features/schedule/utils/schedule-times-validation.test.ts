import { describe, expect, it } from "vitest";
import { validateScheduleTimesForFestival } from "./schedule-times-validation";

function festival(
  opts: { startDate?: string | null; endDate?: string | null } = {},
) {
  const out: { startDate: string | null; endDate: string | null } = {
    startDate: "2026-08-15T00:00:00.000Z",
    endDate: "2026-08-18T23:59:59.000Z",
  };
  if ("startDate" in opts) out.startDate = opts.startDate ?? null;
  if ("endDate" in opts) out.endDate = opts.endDate ?? null;
  return out;
}

describe("validateScheduleTimesForFestival", () => {
  describe("festival date guards", () => {
    it("rejects when festival startDate is missing", () => {
      const result = validateScheduleTimesForFestival(
        festival({ startDate: null }),
        new Date("2026-08-16T05:00:00.000Z"),
        null,
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/festival event start/i);
      }
    });

    it("rejects when festival endDate is missing", () => {
      const result = validateScheduleTimesForFestival(
        festival({ endDate: null }),
        new Date("2026-08-16T05:00:00.000Z"),
        null,
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/festival event start/i);
      }
    });

    it("rejects when festival endDate is unparseable", () => {
      const result = validateScheduleTimesForFestival(
        festival({ endDate: "not-a-date" }),
        new Date("2026-08-16T05:00:00.000Z"),
        null,
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/invalid/i);
      }
    });
  });

  describe("day-key format", () => {
    it("rejects an empty scheduleDayKey", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-16T05:00:00.000Z"),
        null,
        "",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/valid schedule date/i);
      }
    });

    it("rejects a malformed scheduleDayKey", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-16T05:00:00.000Z"),
        null,
        "16-08-2026",
      );
      expect(result.ok).toBe(false);
    });

    it("treats whitespace around the day key as invalid", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-16T05:00:00.000Z"),
        null,
        "  2026-08-16",
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("ISSUE-16 Slice 2: lower bound dropped", () => {
    it("accepts a date BEFORE festival.startDate (off-stage programmes)", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-10T05:00:00.000Z"),
        null,
        "2026-08-10",
      );
      expect(result.ok).toBe(true);
    });

    it("accepts a date far in the past", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2025-01-01T00:00:00.000Z"),
        null,
        "2025-01-01",
      );
      expect(result.ok).toBe(true);
    });

    it("accepts the festival startDate itself", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-15T05:00:00.000Z"),
        null,
        "2026-08-15",
      );
      expect(result.ok).toBe(true);
    });

    it("rejects a date AFTER festival.endDate with the new error", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-19T05:00:00.000Z"),
        null,
        "2026-08-19",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/after your festival event end date/i);
        expect(result.error).not.toMatch(/outside your festival event dates/i);
      }
    });

    it("accepts the festival endDate itself", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-18T18:00:00.000Z"),
        null,
        "2026-08-18",
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("time ordering", () => {
    it("rejects an Invalid Date startTime", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date(NaN),
        null,
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/invalid start time/i);
      }
    });

    it("rejects an Invalid Date endTime", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-16T05:00:00.000Z"),
        new Date(NaN),
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/invalid end time/i);
      }
    });

    it("rejects when endTime is before startTime", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-16T10:00:00.000Z"),
        new Date("2026-08-16T09:00:00.000Z"),
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/end time must be after start time/i);
      }
    });

    it("rejects when endTime equals startTime", () => {
      const same = new Date("2026-08-16T10:00:00.000Z");
      const result = validateScheduleTimesForFestival(
        festival(),
        same,
        same,
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
    });

    it("rejects when start and end are on different calendar days", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-16T23:00:00.000Z"),
        new Date("2026-08-17T01:00:00.000Z"),
        "2026-08-16",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/same calendar day/i);
      }
    });

    it("accepts when start and end are on the same calendar day", () => {
      const result = validateScheduleTimesForFestival(
        festival(),
        new Date("2026-08-16T09:00:00.000Z"),
        new Date("2026-08-16T10:30:00.000Z"),
        "2026-08-16",
      );
      expect(result.ok).toBe(true);
    });
  });
});
