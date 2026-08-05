import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "@/core/errors/errors";
import {
  assertAssignmentShape,
  isGroupAssignment,
  isIndividualAssignment,
} from "./assert-assignment-shape";

function caughtMessage(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error("expected throw");
}

describe("assertAssignmentShape", () => {
  describe("INDIVIDUAL programme", () => {
    it("accepts a row with participantId and no groupId", () => {
      expect(() =>
        assertAssignmentShape("INDIVIDUAL", { participantId: "p1" }),
      ).not.toThrow();
    });

    it("accepts a row with participantId and ignores teamNumber", () => {
      expect(() =>
        assertAssignmentShape("INDIVIDUAL", {
          participantId: "p1",
          teamNumber: 99,
        }),
      ).not.toThrow();
    });

    it("throws when groupId is present", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape("INDIVIDUAL", {
          participantId: "p1",
          groupId: "g1",
        }),
      );
      expect(msg).toBe(
        ERROR_MESSAGES.ASSIGNMENT_INDIVIDUAL_REQUIRES_PARTICIPANT,
      );
    });

    it("throws when participantId is missing", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape("INDIVIDUAL", { groupId: null }),
      );
      expect(msg).toBe(
        ERROR_MESSAGES.ASSIGNMENT_INDIVIDUAL_REQUIRES_PARTICIPANT,
      );
    });
  });

  describe("GROUP programme", () => {
    it("accepts a row with groupId and teamNumber", () => {
      expect(() =>
        assertAssignmentShape("GROUP", { groupId: "g1", teamNumber: 1 }),
      ).not.toThrow();
    });

    it("accepts teamNumber > 1", () => {
      expect(() =>
        assertAssignmentShape("GROUP", { groupId: "g1", teamNumber: 3 }),
      ).not.toThrow();
    });

    it("throws when participantId is present", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape("GROUP", {
          participantId: "p1",
          groupId: "g1",
          teamNumber: 1,
        }),
      );
      expect(msg).toBe(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_GROUP);
    });

    it("throws when groupId is missing", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape("GROUP", { teamNumber: 1 }),
      );
      expect(msg).toBe(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_GROUP);
    });

    it("accepts missing teamNumber (defaults to 1)", () => {
      expect(() =>
        assertAssignmentShape("GROUP", { groupId: "g1" }),
      ).not.toThrow();
    });

    it("throws when teamNumber is less than 1", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape("GROUP", { groupId: "g1", teamNumber: 0 }),
      );
      expect(msg).toBe(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_TEAM_NUMBER);
    });

    it("throws when teamNumber is not an integer", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape("GROUP", { groupId: "g1", teamNumber: 1.5 }),
      );
      expect(msg).toBe(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_TEAM_NUMBER);
    });
  });

  describe("unknown programme type", () => {
    it("throws on unknown type", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape("UNKNOWN", { participantId: "p1" }),
      );
      expect(msg).toBe(ERROR_MESSAGES.ASSIGNMENT_INVALID_SHAPE);
    });

    it("throws on null type", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape(null, { participantId: "p1" }),
      );
      expect(msg).toBe(ERROR_MESSAGES.ASSIGNMENT_INVALID_SHAPE);
    });

    it("throws on undefined type", () => {
      const msg = caughtMessage(() =>
        assertAssignmentShape(undefined, { participantId: "p1" }),
      );
      expect(msg).toBe(ERROR_MESSAGES.ASSIGNMENT_INVALID_SHAPE);
    });
  });
});

describe("isIndividualAssignment", () => {
  it("returns true when participantId present and groupId absent", () => {
    expect(isIndividualAssignment({ participantId: "p1" })).toBe(true);
  });

  it("returns false when groupId present", () => {
    expect(isIndividualAssignment({ participantId: "p1", groupId: "g1" })).toBe(
      false,
    );
  });

  it("returns false when both missing", () => {
    expect(isIndividualAssignment({})).toBe(false);
  });
});

describe("isGroupAssignment", () => {
  it("returns true when groupId present and participantId absent", () => {
    expect(isGroupAssignment({ groupId: "g1" })).toBe(true);
  });

  it("returns false when participantId present", () => {
    expect(isGroupAssignment({ participantId: "p1", groupId: "g1" })).toBe(
      false,
    );
  });

  it("returns false when groupId missing", () => {
    expect(isGroupAssignment({})).toBe(false);
  });
});
