import { describe, expect, it } from "vitest";
import { instantToWallClockParts, wallClockToInstant } from "@/core/datetime";
import {
  isDeadlineWindowOpen,
  isTeamLeaderActionWindowOpen,
  nextDeadlineWindowTransition,
  resolveDeadlineWindow,
} from "../deadline-window";

const START = "2026-08-05T09:00:00.000Z";
const END = "2026-08-20T17:00:00.000Z";

const at = (iso: string) => new Date(iso);

describe("resolveDeadlineWindow", () => {
  it("is unconfigured when neither bound is set", () => {
    const { state, isLocked } = resolveDeadlineWindow({}, at(END));
    expect(state).toBe("UNCONFIGURED");
    expect(isLocked).toBe(true);
  });

  it("is upcoming before the start", () => {
    const { state, isLocked } = resolveDeadlineWindow(
      { start: START, end: END },
      at("2026-08-05T08:59:59.000Z"),
    );
    expect(state).toBe("UPCOMING");
    expect(isLocked).toBe(true);
  });

  it("is open from the start instant onwards", () => {
    expect(
      resolveDeadlineWindow({ start: START, end: END }, at(START)).state,
    ).toBe("OPEN");
  });

  it("is closed from the deadline instant onwards", () => {
    expect(
      resolveDeadlineWindow({ start: START, end: END }, at(END)).state,
    ).toBe("CLOSED");
  });

  it("closing wins over a start that hasn't arrived (misconfigured window)", () => {
    expect(
      resolveDeadlineWindow(
        { start: END, end: START },
        at("2026-08-21T00:00:00.000Z"),
      ).state,
    ).toBe("CLOSED");
  });

  it("treats a start-only window as never closing", () => {
    expect(
      resolveDeadlineWindow({ start: START }, at("2027-01-01T00:00:00.000Z"))
        .state,
    ).toBe("OPEN");
  });

  it("treats an end-only window as open from the beginning", () => {
    expect(
      resolveDeadlineWindow({ end: END }, at("2020-01-01T00:00:00.000Z")).state,
    ).toBe("OPEN");
  });
});

describe("isDeadlineWindowOpen", () => {
  it("is true inside a configured window", () => {
    expect(
      isDeadlineWindowOpen(
        { start: START, end: END },
        at("2026-08-10T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("is false after the deadline", () => {
    expect(
      isDeadlineWindowOpen(
        { start: START, end: END },
        at("2026-08-25T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("is false before the start", () => {
    expect(
      isDeadlineWindowOpen(
        { start: START, end: END },
        at("2026-08-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("keeps the legacy 'no deadline = open' semantics", () => {
    expect(isDeadlineWindowOpen({}, at(START))).toBe(true);
    expect(
      isDeadlineWindowOpen({ start: START }, at("2027-01-01T00:00:00.000Z")),
    ).toBe(true);
    expect(
      isDeadlineWindowOpen({ end: END }, at("2020-01-01T00:00:00.000Z")),
    ).toBe(true);
  });
});

describe("isTeamLeaderActionWindowOpen", () => {
  it("is true only between an explicitly-set start and end", () => {
    expect(
      isTeamLeaderActionWindowOpen(
        { start: START, end: END },
        at("2026-08-10T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("is false before the start", () => {
    expect(
      isTeamLeaderActionWindowOpen(
        { start: START, end: END },
        at("2026-08-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("is false after the end", () => {
    expect(
      isTeamLeaderActionWindowOpen(
        { start: START, end: END },
        at("2026-08-25T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("is false when neither bound is set (no deadline configured)", () => {
    expect(isTeamLeaderActionWindowOpen({}, at(END))).toBe(false);
  });

  it("is false when only the start is set", () => {
    expect(
      isTeamLeaderActionWindowOpen(
        { start: START },
        at("2026-08-10T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("is false when only the end is set", () => {
    expect(
      isTeamLeaderActionWindowOpen(
        { end: END },
        at("2026-08-10T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("nextDeadlineWindowTransition", () => {
  it("points at the start while upcoming", () => {
    expect(
      nextDeadlineWindowTransition(
        at(START),
        at(END),
        at("2026-08-01T00:00:00.000Z"),
      ),
    ).toEqual(at(START));
  });

  it("points at the deadline while open", () => {
    expect(
      nextDeadlineWindowTransition(
        at(START),
        at(END),
        at("2026-08-10T00:00:00.000Z"),
      ),
    ).toEqual(at(END));
  });

  it("is null once closed — nothing left to schedule", () => {
    expect(
      nextDeadlineWindowTransition(
        at(START),
        at(END),
        at("2026-08-25T00:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("is null when unconfigured — no scheduled flip until bounds are set", () => {
    expect(nextDeadlineWindowTransition(null, null, at(END))).toBeNull();
  });
});

describe("deadline-window round-trip (regression for the team-leader display bug)", () => {
  // Admin typed "Programme Assignment: 09/08/2026 00:00 → 10/08/2026 23:00"
  // in `Asia/Kolkata`. The picker must anchor to the festival TZ, so:
  //   wallClockToInstant("2026-08-09", "00:00", "Asia/Kolkata") === "2026-08-08T18:30:00.000Z"
  //   wallClockToInstant("2026-08-10", "23:00", "Asia/Kolkata") === "2026-08-10T17:30:00.000Z"
  // Round-tripping the stored UTC instant back through instantToWallClockParts
  // in IST must recover the original wall-clock — that's the contract the
  // (participant) layout relies on once it wraps with UserTimezoneProviderClient.
  it("preserves IST wall-clock across store / load", () => {
    const startStored = wallClockToInstant(
      "2026-08-09",
      "00:00",
      "Asia/Kolkata",
    );
    const endStored = wallClockToInstant("2026-08-10", "23:00", "Asia/Kolkata");

    expect(startStored).toBe("2026-08-08T18:30:00.000Z");
    expect(endStored).toBe("2026-08-10T17:30:00.000Z");

    const startBack = instantToWallClockParts(startStored, "Asia/Kolkata");
    const endBack = instantToWallClockParts(endStored, "Asia/Kolkata");

    expect(startBack).toEqual({ yyyymmdd: "2026-08-09", hhmm: "00:00" });
    expect(endBack).toEqual({ yyyymmdd: "2026-08-10", hhmm: "23:00" });

    // And the deadline-window state machine must agree the window is
    // upcoming — UTC instants, millisecond math, TZ-independent.
    const { state } = resolveDeadlineWindow(
      { start: startStored, end: endStored },
      at("2026-08-01T00:00:00.000Z"),
    );
    expect(state).toBe("UPCOMING");
  });
});
