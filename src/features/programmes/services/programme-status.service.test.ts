import { describe, expect, it } from "vitest";
import {
  computePreWorksStatus,
  filterProgrammesForEventWorks,
  isProgrammeInEventWorks,
} from "./programme-status.service";

describe("computePreWorksStatus", () => {
  describe("BASIC tier", () => {
    it("returns DRAFT when there are no assignments", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: false,
          hasScheduleEntry: false,
          isFullyAssignedAcrossAllGroups: false,
          isBasic: true,
        }),
      ).toBe("DRAFT");
    });

    it("returns ASSIGNED when there is at least one assignment, regardless of schedule", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: true,
          hasScheduleEntry: false,
          isFullyAssignedAcrossAllGroups: false,
          isBasic: true,
        }),
      ).toBe("ASSIGNED");
    });

    it("returns ASSIGNED when fully assigned and scheduled (BASIC never reaches SCHEDULED)", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: true,
          hasScheduleEntry: true,
          isFullyAssignedAcrossAllGroups: true,
          isBasic: true,
        }),
      ).toBe("ASSIGNED");
    });
  });

  describe("STANDARD/PRO tier", () => {
    it("returns DRAFT when there are no assignments", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: false,
          hasScheduleEntry: false,
          isFullyAssignedAcrossAllGroups: false,
          isBasic: false,
        }),
      ).toBe("DRAFT");
    });

    it("returns DRAFT when scheduled but no assignments at all", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: false,
          hasScheduleEntry: true,
          isFullyAssignedAcrossAllGroups: false,
          isBasic: false,
        }),
      ).toBe("DRAFT");
    });

    it("returns DRAFT when partially assigned and scheduled (no premature SCHEDULED)", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: true,
          hasScheduleEntry: true,
          isFullyAssignedAcrossAllGroups: false,
          isBasic: false,
        }),
      ).toBe("DRAFT");
    });

    it("returns ASSIGNED when fully assigned but not yet scheduled", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: true,
          hasScheduleEntry: false,
          isFullyAssignedAcrossAllGroups: true,
          isBasic: false,
        }),
      ).toBe("ASSIGNED");
    });

    it("returns SCHEDULED only when fully assigned AND scheduled", () => {
      expect(
        computePreWorksStatus({
          hasAssignments: true,
          hasScheduleEntry: true,
          isFullyAssignedAcrossAllGroups: true,
          isBasic: false,
        }),
      ).toBe("SCHEDULED");
    });
  });
});

describe("isProgrammeInEventWorks", () => {
  it("BASIC: includes ASSIGNED, PENDING_PUBLICATION, PUBLISHED, ANNOUNCED", () => {
    expect(isProgrammeInEventWorks("ASSIGNED", "BASIC")).toBe(true);
    expect(isProgrammeInEventWorks("PENDING_PUBLICATION", "BASIC")).toBe(true);
    expect(isProgrammeInEventWorks("PUBLISHED", "BASIC")).toBe(true);
    expect(isProgrammeInEventWorks("ANNOUNCED", "BASIC")).toBe(true);
  });

  it("BASIC: excludes DRAFT, SCHEDULED, REPORTING, JUDGING, CANCELLED", () => {
    expect(isProgrammeInEventWorks("DRAFT", "BASIC")).toBe(false);
    expect(isProgrammeInEventWorks("SCHEDULED", "BASIC")).toBe(false);
    expect(isProgrammeInEventWorks("REPORTING", "BASIC")).toBe(false);
    expect(isProgrammeInEventWorks("JUDGING", "BASIC")).toBe(false);
    expect(isProgrammeInEventWorks("CANCELLED", "BASIC")).toBe(false);
  });

  it("STANDARD/PRO: includes SCHEDULED and onward to ANNOUNCED", () => {
    expect(isProgrammeInEventWorks("SCHEDULED", "STANDARD")).toBe(true);
    expect(isProgrammeInEventWorks("REPORTING", "PRO")).toBe(true);
    expect(isProgrammeInEventWorks("PENDING_JUDGMENT", "STANDARD")).toBe(true);
    expect(isProgrammeInEventWorks("JUDGING", "PRO")).toBe(true);
    expect(isProgrammeInEventWorks("PENDING_PUBLICATION", "STANDARD")).toBe(
      true,
    );
    expect(isProgrammeInEventWorks("PUBLISHED", "PRO")).toBe(true);
    expect(isProgrammeInEventWorks("ANNOUNCED", "STANDARD")).toBe(true);
  });

  it("STANDARD/PRO: excludes DRAFT and ASSIGNED", () => {
    expect(isProgrammeInEventWorks("DRAFT", "STANDARD")).toBe(false);
    expect(isProgrammeInEventWorks("ASSIGNED", "PRO")).toBe(false);
    expect(isProgrammeInEventWorks("CANCELLED", "STANDARD")).toBe(false);
  });
});

describe("filterProgrammesForEventWorks", () => {
  const programmes = [
    { id: "p1", status: "DRAFT", assignments: [] },
    { id: "p2", status: "ASSIGNED", assignments: [{ id: "a1" }] },
    { id: "p3", status: "SCHEDULED", assignments: [{ id: "a2" }] },
    { id: "p4", status: "PUBLISHED", assignments: [] },
  ];

  it("BASIC: keeps ASSIGNED and PUBLISHED, drops DRAFT, keeps SCHEDULED via legacy carve-out when it has assignments", () => {
    const filtered = filterProgrammesForEventWorks(programmes, "BASIC");
    expect(filtered.map((p) => p.id)).toEqual(["p2", "p3", "p4"]);
  });

  it("BASIC: legacy DRAFT with assignments still appears", () => {
    const legacy = [
      { id: "legacy", status: "DRAFT", assignments: [{ id: "x" }] },
    ];
    expect(
      filterProgrammesForEventWorks(legacy, "BASIC").map((p) => p.id),
    ).toEqual(["legacy"]);
  });

  it("STANDARD/PRO: keeps SCHEDULED and PUBLISHED, drops ASSIGNED", () => {
    const filtered = filterProgrammesForEventWorks(programmes, "STANDARD");
    expect(filtered.map((p) => p.id)).toEqual(["p3", "p4"]);
  });
});
