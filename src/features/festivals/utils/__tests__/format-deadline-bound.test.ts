import { describe, expect, it } from "vitest";
import { formatDeadlineBound } from "../format-deadline-bound";

describe("formatDeadlineBound", () => {
  it("renders an Asia/Kolkata wall-clock for a stored UTC instant", () => {
    // Stored value: 2026-08-08T18:30:00.000Z (admin typed "09/08/2026 00:00 IST").
    // Render target: "Aug 9, 12:00 AM" — NOT "Aug 8, 6:30 PM".
    expect(
      formatDeadlineBound("2026-08-08T18:30:00.000Z", "Asia/Kolkata"),
    ).toBe("Aug 9, 12:00 AM");
  });

  it("renders UTC when tz is UTC (the bug — provider missing → DEFAULT_TZ)", () => {
    // This is exactly what team leaders see today: the admin's "Aug 9 00:00 IST"
    // round-trips to "Aug 8, 6:30 PM" because the (participant) layout never
    // wraps children with UserTimezoneProviderClient, so useDisplayTimezone()
    // falls back to DEFAULT_TZ ("UTC").
    expect(formatDeadlineBound("2026-08-08T18:30:00.000Z", "UTC")).toBe(
      "Aug 8, 6:30 PM",
    );
  });

  it("renders the IST closing time correctly", () => {
    // 2026-08-10T17:30:00.000Z == 2026-08-10 23:00 IST.
    expect(
      formatDeadlineBound("2026-08-10T17:30:00.000Z", "Asia/Kolkata"),
    ).toBe("Aug 10, 11:00 PM");
  });

  it("accepts a Date instance", () => {
    expect(
      formatDeadlineBound(new Date("2026-08-08T18:30:00.000Z"), "Asia/Kolkata"),
    ).toBe("Aug 9, 12:00 AM");
  });

  it("returns em-dash for null / undefined / invalid", () => {
    expect(formatDeadlineBound(null, "Asia/Kolkata")).toBe("—");
    expect(formatDeadlineBound(undefined, "Asia/Kolkata")).toBe("—");
    expect(formatDeadlineBound("", "Asia/Kolkata")).toBe("—");
    expect(formatDeadlineBound("not-a-date", "Asia/Kolkata")).toBe("—");
  });

  it("honours a custom pattern (DeadlineWindowGate uses 'EEE, MMM d • h:mm a')", () => {
    expect(
      formatDeadlineBound(
        "2026-08-08T18:30:00.000Z",
        "Asia/Kolkata",
        "EEE, MMM d • h:mm a",
      ),
    ).toBe("Sun, Aug 9 • 12:00 AM");
  });
});
