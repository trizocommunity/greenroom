import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDispatch } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/notifications/services/notification.service", () => ({
  NotificationService: {
    dispatch: (...args: unknown[]) => mockDispatch(...args),
  },
}));

vi.mock("./code-letter-adapter.service", () => ({
  CodeLetterAdapter: {
    listRevealedCodes: vi
      .fn()
      .mockResolvedValue([{ participantId: "part-1", code: "A" }]),
    onReportingReset: vi.fn().mockResolvedValue(undefined),
    onReportingReopened: vi.fn().mockResolvedValue(undefined),
    onCheckoutCompleted: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ReportingEventAdapter } from "./reporting-event-adapter.service";

describe("ReportingEventAdapter in-app notifications", () => {
  beforeEach(() => {
    mockDispatch.mockReset();
  });

  it("dispatches only REPORTING_STARTED on reporting started", async () => {
    await ReportingEventAdapter.handle({
      type: "REPORTING_STARTED",
      festivalId: "fest-1",
      programmeId: "prog-1",
      reportingSessionId: "sess-1",
      actorName: "Stage Manager",
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "REPORTING_STARTED",
        targets: {
          programmeId: "prog-1",
          includeTeamLeadersForProgramme: true,
        },
      }),
    );
  });

  it("dispatches only REPORTING_CLOSED on reporting closed and returns revealed codes without extra notifications", async () => {
    const result = await ReportingEventAdapter.handle({
      type: "REPORTING_CLOSED",
      festivalId: "fest-1",
      programmeId: "prog-1",
      reportingSessionId: "sess-1",
      programmeType: "INDIVIDUAL",
      actorName: "Stage Manager",
      effectiveEndedAt: new Date().toISOString(),
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "REPORTING_CLOSED",
        targets: {
          programmeId: "prog-1",
          includeTeamLeadersForProgramme: true,
        },
      }),
    );
    expect(result.participantCodes).toEqual([
      { participantId: "part-1", code: "A" },
    ]);
  });

  it("dispatches only REPORTING_RESET on reporting reset", async () => {
    await ReportingEventAdapter.handle({
      type: "REPORTING_RESET",
      festivalId: "fest-1",
      programmeId: "prog-1",
      reportingSessionId: "sess-1",
      programmeType: "INDIVIDUAL",
      actorName: "Stage Manager",
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "REPORTING_RESET",
        targets: {
          programmeId: "prog-1",
          includeTeamLeadersForProgramme: true,
        },
      }),
    );
  });

  it("dispatches only REPORTING_RESET on reporting reopened", async () => {
    await ReportingEventAdapter.handle({
      type: "REPORTING_REOPENED",
      festivalId: "fest-1",
      programmeId: "prog-1",
      reportingSessionId: "sess-1",
      programmeType: "INDIVIDUAL",
      actorName: "Stage Manager",
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "REPORTING_RESET",
        targets: {
          programmeId: "prog-1",
          includeTeamLeadersForProgramme: true,
        },
      }),
    );
  });

  it("does not dispatch notifications for attendance marked or unmarked", async () => {
    await ReportingEventAdapter.handle({
      type: "PARTICIPANT_MARKED",
      festivalId: "fest-1",
      programmeId: "prog-1",
      reportingSessionId: "sess-1",
      assignmentId: "asgn-1",
      participantIds: ["part-1"],
      groupId: "grp-1",
      teamNumber: 1,
      programmeType: "INDIVIDUAL",
      isBulk: false,
      actorName: "Stage Manager",
    });

    await ReportingEventAdapter.handle({
      type: "PARTICIPANT_UNMARKED",
      festivalId: "fest-1",
      programmeId: "prog-1",
      reportingSessionId: "sess-1",
      assignmentId: "asgn-1",
      participantIds: ["part-1"],
      groupId: "grp-1",
      teamNumber: 1,
      programmeType: "INDIVIDUAL",
      isBulk: false,
      actorName: "Stage Manager",
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch notifications for checkout completed", async () => {
    await ReportingEventAdapter.handle({
      type: "CHECKOUT_COMPLETED",
      festivalId: "fest-1",
      programmeId: "prog-1",
      reportingSessionId: "sess-1",
      programmeType: "INDIVIDUAL",
      actorName: "Stage Manager",
      candidateCount: 5,
      shuffledCodeAssignments: [],
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
