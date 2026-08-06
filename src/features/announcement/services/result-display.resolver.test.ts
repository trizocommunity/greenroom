import { describe, expect, it } from "vitest";
import {
  buildAssignmentDisplays,
  formatParticipantLabel,
  type ResultDisplayRow,
} from "./result-display.resolver";

describe("buildAssignmentDisplays", () => {
  const rows: ResultDisplayRow[] = [
    { assignmentId: "a1", individualParticipantName: "Alice", individualChestNumber: "101" },
    { assignmentId: "a2", individualParticipantName: null, individualChestNumber: null },
    { assignmentId: "a3", individualParticipantName: "Charlie", individualChestNumber: "103" },
  ];

  it("prefers the team lead over individual and member fallbacks", () => {
    const leads = new Map([["a3", { name: "Team Lead", chestNumber: "999" }]]);
    const members = new Map([["a2", { name: "Member Bob", chestNumber: "202" }]]);

    const displays = buildAssignmentDisplays(rows, leads, members);

    expect(displays.get("a1")).toEqual({
      name: "Alice",
      chestNumber: "101",
      isTeamLeader: false,
    });
    expect(displays.get("a2")).toEqual({
      name: "Member Bob",
      chestNumber: "202",
      isTeamLeader: false,
    });
    expect(displays.get("a3")).toEqual({
      name: "Team Lead",
      chestNumber: "999",
      isTeamLeader: true,
    });
  });

  it("falls back to the individual participant when no lead exists", () => {
    const displays = buildAssignmentDisplays(rows, new Map(), new Map());

    expect(displays.get("a1")).toEqual({
      name: "Alice",
      chestNumber: "101",
      isTeamLeader: false,
    });
  });

  it("falls back to the first member when there is no lead or individual", () => {
    const members = new Map([["a2", { name: "Member Bob", chestNumber: "202" }]]);
    const displays = buildAssignmentDisplays(rows, new Map(), members);

    expect(displays.get("a2")).toEqual({
      name: "Member Bob",
      chestNumber: "202",
      isTeamLeader: false,
    });
  });

  it("returns null display info when no source is available", () => {
    const displays = buildAssignmentDisplays(rows, new Map(), new Map());

    expect(displays.get("a2")).toEqual({
      name: null,
      chestNumber: null,
      isTeamLeader: false,
    });
  });
});

describe("formatParticipantLabel", () => {
  it("returns the individual name for non-group programmes", () => {
    expect(
      formatParticipantLabel("INDIVIDUAL", {
        name: "Alice",
        chestNumber: null,
        isTeamLeader: false,
      }),
    ).toBe("Alice");
  });

  it("returns null for non-group programmes without a display name", () => {
    expect(formatParticipantLabel("INDIVIDUAL", undefined)).toBeNull();
  });

  it("formats the group label with the display name", () => {
    expect(
      formatParticipantLabel("GROUP", {
        name: "Alice",
        chestNumber: null,
        isTeamLeader: true,
      }),
    ).toBe("Alice and team");
  });

  it("returns 'Team' for group programmes without a display name", () => {
    expect(formatParticipantLabel("GROUP", undefined)).toBe("Team");
  });
});
