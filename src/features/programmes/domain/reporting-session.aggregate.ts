import { randomUUID } from "node:crypto";
import type {
  CheckoutCompleted,
  ParticipantMarked,
  ParticipantUnmarked,
  ReportingClosed,
  ReportingDomainEvent,
  ReportingReopened,
  ReportingReset,
  ReportingStarted,
  ReportingUnlockedForScheduleChange,
} from "./reporting-events";

export type ReportingStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "CLOSED"
  | "RESET";

export type Assignment = {
  id: string;
  programmeId: string;
  participantId: string | null;
  groupId: string | null;
  teamNumber: number | null;
};

export type AssignmentMember = {
  id: string;
  assignmentId: string;
  participantId: string;
};

export type ReportedParticipant = {
  id: string;
  reportingSessionId: string;
  assignmentId: string;
  participantId: string | null;
  groupId: string | null;
  teamNumber: number | null;
  assignmentMemberId: string | null;
  reportedBy: string | null;
  reportedAt: string | null;
};

export type CodeLetter = {
  id: string;
  code: string;
  issuedAt: string;
  issuedBy: string | null;
  /** Checkout scan order of the participant this tile belongs to. */
  queuePosition: number | null;
  /** null while the tile is still unscratched. */
  revealedAt: string | null;
  revealedBy: string | null;
  recipients: Array<{
    participantId: string;
    assignmentMemberId: string | null;
  }>;
};

export type ProgrammeType = "INDIVIDUAL" | "GROUP";

export type ReportingSessionState = {
  id: string;
  festivalId: string;
  programmeId: string;
  stageId: string | null;
  scheduleEntryId: string | null;
  status: ReportingStatus;
  isLocked: boolean;
  startedAt: string | null;
  startedBy: string | null;
  endedAt: string | null;
  endedBy: string | null;
  /**
   * Set once, when checkout (step 1) completes and code letters are generated.
   * Gates the scratch step and lets the client resume after a refresh.
   */
  checkoutCompletedAt: string | null;
  windowEndsAt: string | null;
  programmeType: ProgrammeType;
  programmeStatus: string;
  programmeName: string;
  reportedParticipants: ReportedParticipant[];
  codeLetters: CodeLetter[];
  assignments: Assignment[];
};

export class ReportingSession {
  private events: ReportingDomainEvent[] = [];

  constructor(private state: ReportingSessionState) {}

  get id(): string {
    return this.state.id;
  }

  get festivalId(): string {
    return this.state.festivalId;
  }

  get programmeId(): string {
    return this.state.programmeId;
  }

  get stageId(): string | null {
    return this.state.stageId;
  }

  get scheduleEntryId(): string | null {
    return this.state.scheduleEntryId;
  }

  get status(): ReportingStatus {
    return this.state.status;
  }

  get isLocked(): boolean {
    return this.state.isLocked;
  }

  get programmeType(): ProgrammeType {
    return this.state.programmeType;
  }

  get programmeStatus(): string {
    return this.state.programmeStatus;
  }

  get programmeName(): string {
    return this.state.programmeName;
  }

  get startedAt(): string | null {
    return this.state.startedAt;
  }

  get startedBy(): string | null {
    return this.state.startedBy;
  }

  get endedAt(): string | null {
    return this.state.endedAt;
  }

  get endedBy(): string | null {
    return this.state.endedBy;
  }

  get checkoutCompletedAt(): string | null {
    return this.state.checkoutCompletedAt;
  }

  get windowEndsAt(): string | null {
    return this.state.windowEndsAt;
  }

  get reportedParticipants(): readonly ReportedParticipant[] {
    return this.state.reportedParticipants;
  }

  get codeLetters(): readonly CodeLetter[] {
    return this.state.codeLetters;
  }

  get assignments(): readonly Assignment[] {
    return this.state.assignments;
  }

  toState(): ReportingSessionState {
    return { ...this.state };
  }

  private record(event: ReportingDomainEvent): void {
    this.events.push(event);
  }

  getEvents(): ReportingDomainEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }

  start(actorName: string): void {
    if (this.state.isLocked) {
      throw new Error("Reporting is locked for this programme");
    }
    if (this.state.status === "CLOSED") {
      throw new Error("Reporting already closed");
    }

    const now = new Date().toISOString();
    this.state.status = "IN_PROGRESS";
    this.state.startedAt = now;
    this.state.startedBy = actorName;
    this.state.endedAt = null;
    this.state.endedBy = null;

    this.record({
      type: "REPORTING_STARTED",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      actorName,
    });
  }

  markParticipant(
    assignment: Assignment,
    members: AssignmentMember[],
    actorName: string,
  ): void {
    this.assertCanMutate();

    if (assignment.programmeId !== this.state.programmeId) {
      throw new Error(
        "Assignment does not belong to this programme reporting session",
      );
    }

    const isGroupProgramme = this.state.programmeType === "GROUP";

    if (isGroupProgramme && assignment.groupId) {
      const alreadyReported = this.state.reportedParticipants.some(
        (p) => p.assignmentId === assignment.id,
      );
      if (alreadyReported) {
        throw new Error(
          `Team ${assignment.teamNumber ?? 1} has already been reported`,
        );
      }

      const now = new Date().toISOString();
      const participantIds = members.map((m) => m.participantId);

      for (const member of members) {
        this.state.reportedParticipants.push({
          id: randomUUID(),
          reportingSessionId: this.state.id,
          assignmentId: assignment.id,
          participantId: member.participantId,
          groupId: assignment.groupId,
          teamNumber: assignment.teamNumber,
          assignmentMemberId: member.id,
          reportedBy: actorName,
          reportedAt: now,
        });
      }

      this.record({
        type: "PARTICIPANT_MARKED",
        festivalId: this.state.festivalId,
        reportingSessionId: this.state.id,
        programmeId: this.state.programmeId,
        assignmentId: assignment.id,
        participantIds,
        groupId: assignment.groupId,
        teamNumber: assignment.teamNumber,
        programmeType: this.state.programmeType,
        isBulk: false,
        actorName,
      });
    } else {
      const now = new Date().toISOString();
      const existingIndex = this.state.reportedParticipants.findIndex(
        (p) => p.assignmentId === assignment.id,
      );

      if (existingIndex >= 0) {
        this.state.reportedParticipants[existingIndex] = {
          ...this.state.reportedParticipants[existingIndex],
          reportedBy: actorName,
          reportedAt: now,
        };
      } else {
        this.state.reportedParticipants.push({
          id: randomUUID(),
          reportingSessionId: this.state.id,
          assignmentId: assignment.id,
          participantId: assignment.participantId,
          groupId: assignment.groupId,
          teamNumber: assignment.teamNumber,
          assignmentMemberId: null,
          reportedBy: actorName,
          reportedAt: now,
        });
      }

      this.record({
        type: "PARTICIPANT_MARKED",
        festivalId: this.state.festivalId,
        reportingSessionId: this.state.id,
        programmeId: this.state.programmeId,
        assignmentId: assignment.id,
        participantIds: assignment.participantId
          ? [assignment.participantId]
          : [],
        groupId: assignment.groupId,
        teamNumber: assignment.teamNumber,
        programmeType: this.state.programmeType,
        isBulk: false,
        actorName,
      });
    }
  }

  unmarkParticipant(
    assignment: Assignment,
    members: AssignmentMember[],
    actorName: string,
  ): void {
    this.assertCanMutate();

    if (assignment.programmeId !== this.state.programmeId) {
      throw new Error(
        "Assignment does not belong to this programme reporting session",
      );
    }

    this.state.reportedParticipants = this.state.reportedParticipants.filter(
      (p) => p.assignmentId !== assignment.id,
    );

    const participantIds: string[] = [];
    if (this.state.programmeType === "GROUP" && members.length > 0) {
      for (const member of members) {
        participantIds.push(member.participantId);
      }
    } else if (assignment.participantId) {
      participantIds.push(assignment.participantId);
    }

    this.record({
      type: "PARTICIPANT_UNMARKED",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      assignmentId: assignment.id,
      participantIds,
      groupId: assignment.groupId,
      teamNumber: assignment.teamNumber,
      programmeType: this.state.programmeType,
      isBulk: false,
      actorName,
    });
  }

  markParticipantsBulk(
    items: Array<{ assignment: Assignment; members: AssignmentMember[] }>,
    isReported: boolean,
    actorName: string,
  ): void {
    this.assertCanMutate();

    for (const { assignment } of items) {
      if (assignment.programmeId !== this.state.programmeId) {
        throw new Error(
          "Assignment does not belong to this programme reporting session",
        );
      }
    }

    for (const { assignment, members } of items) {
      if (isReported) {
        this.markParticipantBulk(assignment, members, actorName);
      } else {
        this.unmarkParticipantBulk(assignment, members, actorName);
      }
    }
  }

  private markParticipantBulk(
    assignment: Assignment,
    members: AssignmentMember[],
    actorName: string,
  ): void {
    const alreadyReported = this.state.reportedParticipants.some(
      (p) => p.assignmentId === assignment.id,
    );
    if (alreadyReported) {
      return;
    }

    const now = new Date().toISOString();
    const isGroupProgramme = this.state.programmeType === "GROUP";

    if (isGroupProgramme && assignment.groupId && members.length > 0) {
      for (const member of members) {
        this.state.reportedParticipants.push({
          id: randomUUID(),
          reportingSessionId: this.state.id,
          assignmentId: assignment.id,
          participantId: member.participantId,
          groupId: assignment.groupId,
          teamNumber: assignment.teamNumber,
          assignmentMemberId: member.id,
          reportedBy: actorName,
          reportedAt: now,
        });
      }
    } else {
      this.state.reportedParticipants.push({
        id: randomUUID(),
        reportingSessionId: this.state.id,
        assignmentId: assignment.id,
        participantId: assignment.participantId,
        groupId: assignment.groupId,
        teamNumber: assignment.teamNumber,
        assignmentMemberId: null,
        reportedBy: actorName,
        reportedAt: now,
      });
    }

    const participantIds =
      isGroupProgramme && members.length > 0
        ? members.map((m) => m.participantId)
        : assignment.participantId
          ? [assignment.participantId]
          : [];

    this.record({
      type: "PARTICIPANT_MARKED",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      assignmentId: assignment.id,
      participantIds,
      groupId: assignment.groupId,
      teamNumber: assignment.teamNumber,
      programmeType: this.state.programmeType,
      isBulk: true,
      actorName,
    });
  }

  private unmarkParticipantBulk(
    assignment: Assignment,
    members: AssignmentMember[],
    actorName: string,
  ): void {
    this.state.reportedParticipants = this.state.reportedParticipants.filter(
      (p) => p.assignmentId !== assignment.id,
    );

    const participantIds: string[] = [];
    if (this.state.programmeType === "GROUP" && members.length > 0) {
      for (const member of members) {
        participantIds.push(member.participantId);
      }
    } else if (assignment.participantId) {
      participantIds.push(assignment.participantId);
    }

    this.record({
      type: "PARTICIPANT_UNMARKED",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      assignmentId: assignment.id,
      participantIds,
      groupId: assignment.groupId,
      teamNumber: assignment.teamNumber,
      programmeType: this.state.programmeType,
      isBulk: true,
      actorName,
    });
  }

  close(
    actorName: string,
    effectiveEndedAt?: string,
    windowEndsAt?: string | null,
  ): void {
    if (this.state.isLocked) {
      throw new Error("Reporting is already locked");
    }
    if (this.state.status !== "IN_PROGRESS") {
      throw new Error("Only in-progress reporting can be submitted");
    }
    if (!this.state.checkoutCompletedAt) {
      throw new Error("Complete checkout before submitting reporting.");
    }

    const endedAt = effectiveEndedAt ?? new Date().toISOString();
    this.state.status = "CLOSED";
    this.state.isLocked = true;
    this.state.endedAt = endedAt;
    this.state.endedBy = actorName;
    this.state.windowEndsAt = windowEndsAt ?? null;

    this.record({
      type: "REPORTING_CLOSED",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      programmeType: this.state.programmeType,
      actorName,
      effectiveEndedAt: endedAt,
    });
  }

  reset(actorName: string): void {
    this.assertProgrammeStatusAllowsDestructiveChange();
    if (this.state.isLocked) {
      throw new Error("Reporting is locked");
    }

    const now = new Date().toISOString();
    this.state.status = "RESET";
    this.state.isLocked = false;
    this.state.startedAt = null;
    this.state.startedBy = null;
    this.state.endedAt = now;
    this.state.endedBy = actorName;
    this.state.checkoutCompletedAt = null;
    this.state.windowEndsAt = null;
    this.state.reportedParticipants = [];
    this.state.codeLetters = [];

    this.record({
      type: "REPORTING_RESET",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      actorName,
      programmeType: this.state.programmeType,
    });
  }

  reopen(actorName: string): void {
    if (!this.state.isLocked || this.state.status !== "CLOSED") {
      throw new Error(
        "Only closed reporting sessions can be reopened destructively.",
      );
    }

    this.assertProgrammeStatusAllowsDestructiveChange();

    const now = new Date().toISOString();
    this.state.status = "RESET";
    this.state.isLocked = false;
    this.state.startedAt = null;
    this.state.startedBy = null;
    this.state.endedAt = now;
    this.state.endedBy = actorName;
    this.state.checkoutCompletedAt = null;
    this.state.windowEndsAt = null;
    this.state.reportedParticipants = [];
    this.state.codeLetters = [];

    this.record({
      type: "REPORTING_REOPENED",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      actorName,
      programmeType: this.state.programmeType,
    });
  }

  /**
   * Ends checkout (step 1) and opens scratching (step 2).
   *
   * The caller supplies one entry per scratchable unit, already shuffled and
   * already stamped with its checkout-order queue position. The aggregate only
   * records that the gate has been crossed; the read side turns the event into
   * code letter rows.
   */
  completeCheckout(
    actorName: string,
    shuffledCodeAssignments: Array<{
      code: string;
      queuePosition: number;
      participantId: string | null;
      groupId: string | null;
      teamNumber: number | null;
    }>,
  ): void {
    if (this.state.isLocked) {
      throw new Error("Reporting is locked");
    }
    if (this.state.status !== "IN_PROGRESS") {
      throw new Error("Only in-progress reporting can complete checkout");
    }
    if (this.state.checkoutCompletedAt) {
      throw new Error("Checkout has already been completed");
    }
    if (shuffledCodeAssignments.length === 0) {
      throw new Error(
        "Check out at least one participant before completing checkout",
      );
    }

    this.state.checkoutCompletedAt = new Date().toISOString();

    this.record({
      type: "CHECKOUT_COMPLETED",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
      programmeType: this.state.programmeType,
      actorName,
      candidateCount: shuffledCodeAssignments.length,
      shuffledCodeAssignments,
    });
  }

  unlockForScheduleChange(): void {
    this.state.isLocked = false;
    this.state.status = "RESET";
    this.state.startedAt = null;
    this.state.startedBy = null;
    this.state.endedAt = null;
    this.state.endedBy = null;
    this.state.checkoutCompletedAt = null;
    this.state.windowEndsAt = null;
    this.state.reportedParticipants = [];
    this.state.codeLetters = [];

    this.record({
      type: "REPORTING_UNLOCKED_FOR_SCHEDULE_CHANGE",
      festivalId: this.state.festivalId,
      reportingSessionId: this.state.id,
      programmeId: this.state.programmeId,
    });
  }

  private assertCanMutate(): void {
    if (this.state.isLocked) {
      throw new Error("Reporting is locked");
    }
    if (this.state.status !== "IN_PROGRESS") {
      throw new Error("Reporting must be in progress to mark participants");
    }
    if (this.state.checkoutCompletedAt) {
      throw new Error(
        "Checkout is complete — attendance can no longer be changed",
      );
    }
  }

  private assertProgrammeStatusAllowsDestructiveChange(): void {
    if (
      this.state.programmeStatus &&
      !["DRAFT", "REPORTING", "PENDING_JUDGMENT"].includes(
        this.state.programmeStatus,
      )
    ) {
      throw new Error(
        "Cannot reset report because judging or a further stage has already started.",
      );
    }
  }
}
