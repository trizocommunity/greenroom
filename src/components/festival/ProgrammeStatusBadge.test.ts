import { describe, expect, it } from "vitest";
import { getParticipantStatus } from "./ProgrammeStatusBadge";

describe("getParticipantStatus", () => {
  it("maps pre-reporting statuses to 'Not Started'", () => {
    expect(getParticipantStatus("DRAFT").label).toBe("Not Started");
    expect(getParticipantStatus("ASSIGNED").label).toBe("Not Started");
    expect(getParticipantStatus("SCHEDULED").label).toBe("Not Started");
  });

  it("maps reporting through published statuses to 'Ongoing'", () => {
    expect(getParticipantStatus("REPORTING").label).toBe("Ongoing");
    expect(getParticipantStatus("PENDING_JUDGMENT").label).toBe("Ongoing");
    expect(getParticipantStatus("JUDGING").label).toBe("Ongoing");
    expect(getParticipantStatus("PENDING_PUBLICATION").label).toBe("Ongoing");
    expect(getParticipantStatus("PUBLISHED").label).toBe("Ongoing");
  });

  it("maps announced status to 'Announced'", () => {
    expect(getParticipantStatus("ANNOUNCED").label).toBe("Announced");
  });

  it("maps cancelled status to 'Cancelled'", () => {
    expect(getParticipantStatus("CANCELLED").label).toBe("Cancelled");
  });
});
