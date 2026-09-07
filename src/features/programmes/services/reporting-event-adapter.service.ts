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
        return { participantCodes: [] };
      }

      case "REPORTING_CLOSED": {
        // Code letters were generated and revealed during the drawer flow, so
        // closing only announces the transition.
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

        const participantCodes = await CodeLetterAdapter.listRevealedCodes(
          event.reportingSessionId,
        );
        return { participantCodes };
      }

      case "REPORTING_RESET": {
        await CodeLetterAdapter.onReportingReset(event);

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
        return { participantCodes: [] };
      }

      case "PARTICIPANT_UNMARKED": {
        return { participantCodes: [] };
      }

      case "CHECKOUT_COMPLETED": {
        await CodeLetterAdapter.onCheckoutCompleted(event);
        return { participantCodes: [] };
      }
    }
  },
};
