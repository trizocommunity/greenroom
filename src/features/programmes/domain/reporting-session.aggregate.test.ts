import { beforeEach, describe, expect, it } from "vitest";
import {
  type Assignment,
  type AssignmentMember,
  type CodeLetter,
  ReportingSession,
  type ReportingSessionState,
} from "./reporting-session.aggregate";

function makeState(
  overrides: Partial<ReportingSessionState> = {},
): ReportingSessionState {
  return {
    id: "rs-1",
    festivalId: "fest-1",
    programmeId: "prog-1",
    stageId: "stage-1",
    scheduleEntryId: "se-1",
    status: "NOT_STARTED",
    isLocked: false,
    startedAt: null,
    startedBy: null,
    endedAt: null,
    endedBy: null,
    checkoutCompletedAt: null,
    programmeType: "INDIVIDUAL",
    programmeStatus: "SCHEDULED",
    programmeName: "Test Programme",
    reportedParticipants: [],
    codeLetters: [],
    assignments: [],
    ...overrides,
  };
}

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: "assign-1",
    programmeId: "prog-1",
    participantId: "part-1",
    groupId: null,
    teamNumber: null,
    ...overrides,
  };
}

function makeMember(
  overrides: Partial<AssignmentMember> = {},
): AssignmentMember {
  return {
    id: "member-1",
    assignmentId: "assign-1",
    participantId: "part-1",
    ...overrides,
  };
}

/** A tile that has already been scratched, unless overridden. */
function makeCodeLetter(overrides: Partial<CodeLetter> = {}): CodeLetter {
  return {
    id: "cl-1",
    code: "A",
    issuedAt: new Date().toISOString(),
    issuedBy: "Stage Manager",
    queuePosition: 1,
    revealedAt: new Date().toISOString(),
    revealedBy: "Stage Manager",
    recipients: [{ participantId: "part-1", assignmentMemberId: null }],
    ...overrides,
  };
}

describe("ReportingSession aggregate", () => {
  describe("start", () => {
    it("transitions from NOT_STARTED to IN_PROGRESS", () => {
      const session = new ReportingSession(makeState());
      session.start("Stage Manager");
      expect(session.status).toBe("IN_PROGRESS");
      expect(session.startedBy).toBe("Stage Manager");
      expect(session.getEvents()).toHaveLength(1);
      expect(session.getEvents()[0]?.type).toBe("REPORTING_STARTED");
    });

    it("throws when the session is locked", () => {
      const session = new ReportingSession(makeState({ isLocked: true }));
      expect(() => session.start("Stage Manager")).toThrow(/locked/i);
    });

    it("throws when the session is already closed", () => {
      const session = new ReportingSession(makeState({ status: "CLOSED" }));
      expect(() => session.start("Stage Manager")).toThrow(/already closed/i);
    });
  });

  describe("markParticipant", () => {
    it("adds a reported participant for an individual assignment", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS" }),
      );
      session.markParticipant(makeAssignment(), [], "Stage Manager");
      expect(session.reportedParticipants).toHaveLength(1);
      expect(session.reportedParticipants[0]?.participantId).toBe("part-1");
      expect(session.getEvents()[0]?.type).toBe("PARTICIPANT_MARKED");
    });

    it("throws when reporting is not in progress", () => {
      const session = new ReportingSession(
        makeState({ status: "NOT_STARTED" }),
      );
      expect(() =>
        session.markParticipant(makeAssignment(), [], "Stage Manager"),
      ).toThrow(/must be in progress/i);
    });

    it("throws when reporting is locked", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS", isLocked: true }),
      );
      expect(() =>
        session.markParticipant(makeAssignment(), [], "Stage Manager"),
      ).toThrow(/locked/i);
    });

    it("throws when the assignment belongs to another programme", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS" }),
      );
      expect(() =>
        session.markParticipant(
          makeAssignment({ programmeId: "other-prog" }),
          [],
          "Stage Manager",
        ),
      ).toThrow(/does not belong/i);
    });

    it("adds one reported row per member for a group team", () => {
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          programmeType: "GROUP",
        }),
      );
      session.markParticipant(
        makeAssignment({
          participantId: null,
          groupId: "group-1",
          teamNumber: 1,
        }),
        [
          makeMember({ id: "m1", participantId: "p1" }),
          makeMember({ id: "m2", participantId: "p2" }),
        ],
        "Stage Manager",
      );
      expect(session.reportedParticipants).toHaveLength(2);
      expect(session.reportedParticipants[0]?.groupId).toBe("group-1");
      expect(session.reportedParticipants[0]?.teamNumber).toBe(1);
      expect(
        session.reportedParticipants.map((p) => p.participantId).sort(),
      ).toEqual(["p1", "p2"]);
    });

    it("throws when a group team is already reported", () => {
      const assignment = makeAssignment({
        participantId: null,
        groupId: "group-1",
        teamNumber: 1,
      });
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          programmeType: "GROUP",
          reportedParticipants: [
            {
              id: "rp-1",
              reportingSessionId: "rs-1",
              assignmentId: assignment.id,
              participantId: "p1",
              groupId: "group-1",
              teamNumber: 1,
              assignmentMemberId: null,
              reportedBy: "Stage Manager",
              reportedAt: new Date().toISOString(),
            },
          ],
        }),
      );
      expect(() =>
        session.markParticipant(assignment, [makeMember()], "Stage Manager"),
      ).toThrow(/already been reported/i);
    });
  });

  describe("unmarkParticipant", () => {
    it("removes a reported participant", () => {
      const assignment = makeAssignment();
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          reportedParticipants: [
            {
              id: "rp-1",
              reportingSessionId: "rs-1",
              assignmentId: assignment.id,
              participantId: assignment.participantId,
              groupId: null,
              teamNumber: null,
              assignmentMemberId: null,
              reportedBy: "Stage Manager",
              reportedAt: new Date().toISOString(),
            },
          ],
        }),
      );
      session.unmarkParticipant(assignment, [], "Stage Manager");
      expect(session.reportedParticipants).toHaveLength(0);
      expect(session.getEvents()[0]?.type).toBe("PARTICIPANT_UNMARKED");
    });
  });

  describe("close", () => {
    it("throws when checkout has not been completed", () => {
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          reportedParticipants: [
            {
              id: "rp-1",
              reportingSessionId: "rs-1",
              assignmentId: "assign-1",
              participantId: "part-1",
              groupId: null,
              teamNumber: null,
              assignmentMemberId: null,
              reportedBy: "Stage Manager",
              reportedAt: new Date().toISOString(),
            },
          ],
        }),
      );
      expect(() => session.close("Stage Manager")).toThrow(
        /Complete checkout/i,
      );
    });

    it("succeeds once checkout is complete", () => {
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          checkoutCompletedAt: new Date().toISOString(),
          reportedParticipants: [
            {
              id: "rp-1",
              reportingSessionId: "rs-1",
              assignmentId: "assign-1",
              participantId: "part-1",
              groupId: null,
              teamNumber: null,
              assignmentMemberId: null,
              reportedBy: "Stage Manager",
              reportedAt: new Date().toISOString(),
            },
          ],
        }),
      );
      session.close("Stage Manager");
      expect(session.status).toBe("CLOSED");
      expect(session.isLocked).toBe(true);
      expect(session.getEvents()[0]?.type).toBe("REPORTING_CLOSED");
    });

    it("uses the provided effective ended at timestamp", () => {
      const endedAt = "2026-08-15T10:00:00.000Z";
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          checkoutCompletedAt: new Date().toISOString(),
        }),
      );
      session.close("Stage Manager", endedAt);
      expect(session.endedAt).toBe(endedAt);
    });
  });

  describe("reset", () => {
    it("transitions to RESET and clears reported participants", () => {
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          programmeStatus: "REPORTING",
          checkoutCompletedAt: new Date().toISOString(),
          reportedParticipants: [
            {
              id: "rp-1",
              reportingSessionId: "rs-1",
              assignmentId: "assign-1",
              participantId: "part-1",
              groupId: null,
              teamNumber: null,
              assignmentMemberId: null,
              reportedBy: "Stage Manager",
              reportedAt: new Date().toISOString(),
            },
          ],
          codeLetters: [makeCodeLetter()],
        }),
      );
      session.reset("Stage Manager");
      expect(session.status).toBe("RESET");
      expect(session.reportedParticipants).toHaveLength(0);
      expect(session.codeLetters).toHaveLength(0);
      expect(session.checkoutCompletedAt).toBeNull();
      expect(session.getEvents()[0]?.type).toBe("REPORTING_RESET");
    });

    it("throws when the programme status does not allow reset", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS", programmeStatus: "JUDGING" }),
      );
      expect(() => session.reset("Stage Manager")).toThrow(
        /judging or a further stage/,
      );
    });

    it("throws when reporting is locked", () => {
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          programmeStatus: "REPORTING",
          isLocked: true,
        }),
      );
      expect(() => session.reset("Stage Manager")).toThrow(/locked/i);
    });
  });

  describe("reopen", () => {
    it("transitions a closed locked session to RESET and clears data", () => {
      const session = new ReportingSession(
        makeState({
          status: "CLOSED",
          isLocked: true,
          programmeStatus: "PENDING_JUDGMENT",
          checkoutCompletedAt: new Date().toISOString(),
          reportedParticipants: [
            {
              id: "rp-1",
              reportingSessionId: "rs-1",
              assignmentId: "assign-1",
              participantId: "part-1",
              groupId: null,
              teamNumber: null,
              assignmentMemberId: null,
              reportedBy: "Stage Manager",
              reportedAt: new Date().toISOString(),
            },
          ],
          codeLetters: [makeCodeLetter()],
        }),
      );
      session.reopen("Admin");
      expect(session.status).toBe("RESET");
      expect(session.isLocked).toBe(false);
      expect(session.reportedParticipants).toHaveLength(0);
      expect(session.codeLetters).toHaveLength(0);
      expect(session.checkoutCompletedAt).toBeNull();
      expect(session.getEvents()[0]?.type).toBe("REPORTING_REOPENED");
    });

    it("throws when the session is not closed and locked", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS", programmeStatus: "REPORTING" }),
      );
      expect(() => session.reopen("Admin")).toThrow(/Only closed/i);
    });
  });

  describe("completeCheckout", () => {
    const codeAssignments = [
      {
        code: "C",
        queuePosition: 1,
        participantId: "part-1",
        groupId: null,
        teamNumber: null,
      },
      {
        code: "A",
        queuePosition: 2,
        participantId: "part-2",
        groupId: null,
        teamNumber: null,
      },
    ];

    it("stamps checkout and records the shuffled assignments", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS" }),
      );
      session.completeCheckout("Stage Manager", codeAssignments);

      expect(session.checkoutCompletedAt).not.toBeNull();
      const event = session.getEvents()[0];
      expect(event?.type).toBe("CHECKOUT_COMPLETED");
      expect(
        event &&
          "shuffledCodeAssignments" in event &&
          event.shuffledCodeAssignments,
      ).toHaveLength(2);
    });

    it("unblocks close", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS" }),
      );
      session.completeCheckout("Stage Manager", codeAssignments);
      session.close("Stage Manager");
      expect(session.status).toBe("CLOSED");
    });

    it("freezes attendance once complete", () => {
      const assignment = makeAssignment();
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS" }),
      );
      session.completeCheckout("Stage Manager", codeAssignments);
      expect(() =>
        session.markParticipant(assignment, [], "Stage Manager"),
      ).toThrow(/Checkout is complete/i);
    });

    it("throws when run twice", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS" }),
      );
      session.completeCheckout("Stage Manager", codeAssignments);
      expect(() =>
        session.completeCheckout("Stage Manager", codeAssignments),
      ).toThrow(/already been completed/i);
    });

    it("throws when nobody was checked out", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS" }),
      );
      expect(() => session.completeCheckout("Stage Manager", [])).toThrow(
        /at least one participant/i,
      );
    });

    it("throws when reporting is locked", () => {
      const session = new ReportingSession(
        makeState({ status: "IN_PROGRESS", isLocked: true }),
      );
      expect(() =>
        session.completeCheckout("Stage Manager", codeAssignments),
      ).toThrow(/locked/i);
    });
  });

  describe("unlockForScheduleChange", () => {
    it("resets the session state", () => {
      const session = new ReportingSession(
        makeState({
          status: "IN_PROGRESS",
          isLocked: false,
          reportedParticipants: [
            {
              id: "rp-1",
              reportingSessionId: "rs-1",
              assignmentId: "assign-1",
              participantId: "part-1",
              groupId: null,
              teamNumber: null,
              assignmentMemberId: null,
              reportedBy: "Stage Manager",
              reportedAt: new Date().toISOString(),
            },
          ],
        }),
      );
      session.unlockForScheduleChange();
      expect(session.status).toBe("RESET");
      expect(session.reportedParticipants).toHaveLength(0);
      expect(session.getEvents()[0]?.type).toBe(
        "REPORTING_UNLOCKED_FOR_SCHEDULE_CHANGE",
      );
    });
  });
});
