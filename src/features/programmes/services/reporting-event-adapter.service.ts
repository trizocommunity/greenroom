import { NotificationService } from "@/features/notifications/services/notification.service";
import type { ReportingDomainEvent } from "@/features/programmes/domain/reporting-events";
import {
  CodeLetterAdapter,
  type CodeLetterEntry,
} from "./code-letter-adapter.service";

export type DispatchResult = {
  participantCodes: CodeLetterEntry[];
};

export const ReportingEventAdapter = {
  async dispatch(events: ReportingDomainEvent[]): Promise<DispatchResult> {
    const participantCodes: CodeLetterEntry[] = [];
    for (const event of events) {
      const result = await this.handle(event);
      participantCodes.push(...result.participantCodes);
    }
    return { participantCodes };
  },

  async handle(event: ReportingDomainEvent): Promise<DispatchResult> {
    switch (event.type) {
      case "REPORTING_STARTED": {
        await NotificationService.dispatch({
          eventType: "REPORTING_STARTED",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Programme reporting started",
            body: "Stage reporting has started. Please report to the stage manager.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
            },
          },
          channels: ["IN_APP", "EMAIL"],
        });

        await NotificationService.dispatch({
          eventType: "REPORTING_STARTED",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Programme reporting started",
            body: "Stage reporting has started. Please report to the stage manager.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
              status: "REPORTING",
            },
          },
          channels: ["IN_APP", "EMAIL"],
        });
        return { participantCodes: [] };
      }

      case "REPORTING_CLOSED": {
        const participantCodes = await CodeLetterAdapter.onReportingClosed(event);

        await NotificationService.dispatch({
          eventType: "REPORTING_CLOSED",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Reporting ended",
            body:
              event.programmeType === "GROUP"
                ? "Reporting has ended. Each reported team shares one team code (A, B, C…)."
                : "Reporting has ended. Reported participants received individual code letters.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
            },
          },
          channels: ["IN_APP", "EMAIL"],
        });

        await NotificationService.dispatch({
          eventType: "PROGRAMME_STATUS_CHANGED",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Programme status updated",
            body: "Programme is ready for judgement (Pending Judgment).",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
              status: "PENDING_JUDGMENT",
            },
          },
          channels: ["IN_APP"],
        });

        const isGroup = event.programmeType === "GROUP";
        const notifyByParticipant = new Map<string, string>();
        for (const { participantId, code } of participantCodes) {
          notifyByParticipant.set(participantId, code);
        }
        for (const [participantId, code] of notifyByParticipant) {
          await NotificationService.dispatch({
            eventType: "CODE_LETTER_ISSUED",
            festivalId: event.festivalId,
            targets: { participantIds: [participantId] },
            context: {
              title: isGroup ? "Team code issued" : "Code letter issued",
              body: isGroup
                ? `Your team’s code is ${code}.`
                : `Your programme reporting code letter is ${code}.`,
              payload: {
                reportingSessionId: event.reportingSessionId,
                programmeId: event.programmeId,
                codeLetter: code,
              },
            },
            channels: ["IN_APP", "EMAIL"],
          });
        }
        return { participantCodes };
      }

      case "REPORTING_RESET": {
        await NotificationService.dispatch({
          eventType: "PROGRAMME_STATUS_CHANGED",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Programme reset",
            body: `Programme has been reset. All reporting data cleared. Status: RESET`,
            payload: {
              programmeId: event.programmeId,
              status: "CANCELLED",
            },
          },
          channels: ["IN_APP"],
        });

        await NotificationService.dispatch({
          eventType: "REPORTING_RESET",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Reporting reset",
            body: "All reporting data has been cleared. You can start fresh.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
            },
          },
          channels: ["IN_APP", "EMAIL"],
        });
        return { participantCodes: [] };
      }

      case "REPORTING_REOPENED": {
        await CodeLetterAdapter.onReportingReopened(event);

        await NotificationService.dispatch({
          eventType: "PROGRAMME_STATUS_CHANGED",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Reporting reopened",
            body: "Reporting was reopened. Previous code letters and submitted marks were cleared.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
              status: "SCHEDULED",
            },
          },
          channels: ["IN_APP"],
        });

        await NotificationService.dispatch({
          eventType: "REPORTING_RESET",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Reporting reopened",
            body: "Previous reporting codes are no longer valid. Reporting will restart with new attendance and code letters.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
            },
          },
          channels: ["IN_APP", "EMAIL"],
        });
        return { participantCodes: [] };
      }

      case "REPORTING_UNLOCKED_FOR_SCHEDULE_CHANGE": {
        return { participantCodes: [] };
      }

      case "PARTICIPANT_MARKED": {
        if (event.participantIds.length === 0) return { participantCodes: [] };

        const isGroup = event.programmeType === "GROUP";
        const isSingleTeamConfirmation = isGroup && !event.isBulk;

        await NotificationService.dispatch({
          eventType: "REPORTING_PARTICIPANT_MARKED",
          festivalId: event.festivalId,
          targets: { participantIds: event.participantIds },
          context: {
            title: isSingleTeamConfirmation
              ? "Team reporting confirmed"
              : "Reporting attendance updated",
            body: isSingleTeamConfirmation
              ? `Your team (Team ${event.teamNumber ?? 1}) has been marked as reported.`
              : "You have been marked as reported by stage manager.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              teamNumber: event.teamNumber,
              isReported: true,
            },
          },
          channels: ["IN_APP"],
        });
        return { participantCodes: [] };
      }

      case "PARTICIPANT_UNMARKED": {
        if (event.participantIds.length === 0) return { participantCodes: [] };

        await NotificationService.dispatch({
          eventType: "REPORTING_PARTICIPANT_MARKED",
          festivalId: event.festivalId,
          targets: { participantIds: event.participantIds },
          context: {
            title: "Reporting attendance updated",
            body: "Your reporting mark was removed by stage manager.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              assignmentId: event.assignmentId,
              isReported: false,
            },
          },
          channels: ["IN_APP"],
        });
        return { participantCodes: [] };
      }

      case "SPIN_CODES_ASSIGNED": {
        const participantCodes = await CodeLetterAdapter.onSpinCodesAssigned(event);

        for (const { participantId, code } of participantCodes) {
          await NotificationService.dispatch({
            eventType: "CODE_LETTER_ISSUED",
            festivalId: event.festivalId,
            targets: { participantIds: [participantId] },
            context: {
              title: "Code letter issued",
              body: `Your programme reporting code letter is ${code}.`,
              payload: {
                reportingSessionId: event.reportingSessionId,
                programmeId: event.programmeId,
                codeLetter: code,
              },
            },
            channels: ["IN_APP"],
          });
        }
        return { participantCodes };
      }

      case "CODE_LETTERS_RESET": {
        await CodeLetterAdapter.onCodeLettersReset(event);

        await NotificationService.dispatch({
          eventType: "REPORTING_RESET",
          festivalId: event.festivalId,
          targets: {
            programmeId: event.programmeId,
            includeTeamLeadersForProgramme: true,
          },
          context: {
            title: "Code letters reset",
            body: "All issued code letters were cleared. Stage manager will re-spin and assign fresh letters.",
            payload: {
              reportingSessionId: event.reportingSessionId,
              programmeId: event.programmeId,
              actionBy: event.actorName,
            },
          },
          channels: ["IN_APP"],
        });
        return { participantCodes: [] };
      }
    }
  },
};
