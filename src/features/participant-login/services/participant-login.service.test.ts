import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

const mockFindFestivalBySlug = vi.fn();
const mockFindGroupsByFestival = vi.fn();
const mockParticipantFindFirst = vi.fn();
const mockOtpFindMany = vi.fn();
const mockOtpFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteWhere = vi.fn();
const mockDelete = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/features/festivals/repositories/festival.repository", () => ({
  findFestivalBySlug: (...args: unknown[]) => mockFindFestivalBySlug(...args),
}));

vi.mock("@/features/groups/repositories/group.repository", () => ({
  findGroupsByFestival: (...args: unknown[]) =>
    mockFindGroupsByFestival(...args),
}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      participant: {
        findFirst: (...args: unknown[]) => mockParticipantFindFirst(...args),
      },
      participantOtp: {
        findFirst: (...args: unknown[]) => mockOtpFindFirst(...args),
        findMany: (...args: unknown[]) => mockOtpFindMany(...args),
      },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => {
      mockDelete(...args);
      return { where: mockDeleteWhere };
    },
  },
}));

vi.mock("@/core/auth/participant-session", () => ({
  createRawSessionToken: () => "mock-raw-token",
  getSessionExpiryDate: () => new Date("2030-01-01T00:00:00.000Z"),
  getTokenHash: (t: string) =>
    crypto.createHash("sha256").update(t).digest("hex"),
}));

vi.mock("@/core/integrations/email/index", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  sendEmailSync: (...args: unknown[]) => mockSendEmail(...args),
}));

import { ParticipantLoginService } from "./participant-login.service";

const festival = {
  id: "fest-1",
  name: "Demo Fest",
  slug: "demo-fest",
  timezone: "UTC",
};
const group = { id: "group-1", name: "Al-Qurtuba" };

function makeParticipant(overrides: Record<string, unknown> = {}) {
  return {
    id: "stud-1",
    festivalId: festival.id,
    groupId: group.id,
    categoryId: "cat-1",
    name: "Muhammad Bilal",
    email: null as string | null,
    isTeamLeader: false,
    chestNumber: "101",
    dateOfBirth: "2008-05-12T00:00:00.000Z" as string | null,
    profileSlug: "muhammad-bilal-101",
    group,
    ...overrides,
  };
}

beforeEach(() => {
  mockFindFestivalBySlug.mockReset();
  mockFindGroupsByFestival.mockReset();
  mockParticipantFindFirst.mockReset();
  mockOtpFindMany.mockReset();
  mockOtpFindFirst.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockDeleteWhere.mockReset();
  mockSendEmail.mockReset();

  mockFindFestivalBySlug.mockResolvedValue(festival);
  mockFindGroupsByFestival.mockResolvedValue([group]);

  mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  mockUpdate.mockReturnValue({
    set: vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
  mockDeleteWhere.mockResolvedValue(undefined);
  mockSendEmail.mockResolvedValue({ id: "email-id" });
});

describe("ParticipantLoginService.requestAccess", () => {
  it("throws FESTIVAL_NOT_FOUND when festival slug is unknown", async () => {
    mockFindFestivalBySlug.mockResolvedValueOnce(null);
    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: "missing",
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/festival/i) });
  });

  it("throws PARTICIPANT_NOT_FOUND when chest number does not match", async () => {
    mockParticipantFindFirst.mockResolvedValueOnce(null);
    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "999",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/participant/i),
    });
  });

  it("returns AUTHENTICATED + session row when participant matches by group", async () => {
    const participant = makeParticipant({ isTeamLeader: false });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: festival.slug,
      chestNumber: "101",
      identifierKind: "GROUP",
      identifierValue: group.id,
    });

    expect(result.status).toBe("AUTHENTICATED");
    if (result.status === "AUTHENTICATED") {
      expect(result.participantSlug).toBe(participant.profileSlug);
      expect(result.rawToken).toBe("mock-raw-token");
      expect(result.festivalName).toBe(festival.name);
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns AUTHENTICATED when participant matches by date of birth", async () => {
    const participant = makeParticipant({ isTeamLeader: false });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: festival.slug,
      chestNumber: "101",
      identifierKind: "DOB",
      identifierValue: "2008-05-12T00:00:00.000Z",
    });

    expect(result.status).toBe("AUTHENTICATED");
  });

  it("throws INVALID_DOB when date of birth mismatches", async () => {
    const participant = makeParticipant({ isTeamLeader: false });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "DOB",
        identifierValue: "1999-01-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/date of birth/i),
    });
  });

  it("authenticates when stored DOB is at non-midnight hour in festival TZ (rolls back to correct day)", async () => {
    mockFindFestivalBySlug.mockResolvedValueOnce({
      id: "fest-ist",
      name: "IST Fest",
      slug: "ist-fest",
      timezone: "Asia/Kolkata",
    });
    const participant = makeParticipant({
      isTeamLeader: false,
      dateOfBirth: "2008-05-12T18:30:00.000Z",
    });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: "ist-fest",
      chestNumber: "101",
      identifierKind: "DOB",
      identifierValue: "2008-05-13",
    });
    expect(result.status).toBe("AUTHENTICATED");
  });

  it("accepts user input as either a YYYY-MM-DD string or an ISO instant", async () => {
    const participant = makeParticipant({ isTeamLeader: false });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: festival.slug,
      chestNumber: "101",
      identifierKind: "DOB",
      identifierValue: "2008-05-12",
    });
    expect(result.status).toBe("AUTHENTICATED");
  });

  it("throws PARTICIPANT_NOT_FOUND when group does not match", async () => {
    const participant = makeParticipant({ isTeamLeader: false });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: "other-group-id",
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/participant/i),
    });
  });

  it("throws when group id is not part of festival groups", async () => {
    const participant = makeParticipant({
      isTeamLeader: false,
      groupId: "fake",
    });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: "fake",
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/participant/i),
    });
  });

  it("returns OTP_REQUIRED for team leader and stores an OTP hash", async () => {
    const participant = makeParticipant({
      isTeamLeader: true,
      email: "leader@example.com",
    });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindMany.mockResolvedValueOnce([]);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: festival.slug,
      chestNumber: "101",
      identifierKind: "GROUP",
      identifierValue: group.id,
    });

    expect(result.status).toBe("OTP_REQUIRED");
    if (result.status === "OTP_REQUIRED") {
      expect(typeof result.debugOtp).toBe("string");
      expect(result.debugOtp).toMatch(/^\d{6}$/);
      expect(result.participantSlug).toBe(participant.profileSlug);
    }
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const sendArgs = mockSendEmail.mock.calls[0]![0] as {
      to: string;
      kind: { kind: string; otp: string; festivalName: string };
    };
    expect(sendArgs.to).toBe("leader@example.com");
    expect(sendArgs.kind.kind).toBe("team_leader_otp");
    expect(sendArgs.kind.festivalName).toBe(festival.name);
    expect(sendArgs.kind.otp).toMatch(/^\d{6}$/);
  });

  it("does NOT send email for non-team-leader auth", async () => {
    const participant = makeParticipant({ isTeamLeader: false });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: festival.slug,
      chestNumber: "101",
      identifierKind: "GROUP",
      identifierValue: group.id,
    });

    expect(result.status).toBe("AUTHENTICATED");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("throws EMAIL_SEND_FAILED when email send returns error and rolls back the OTP row", async () => {
    const participant = makeParticipant({
      isTeamLeader: true,
      email: "leader@example.com",
    });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindMany.mockResolvedValueOnce([]);
    mockSendEmail.mockResolvedValueOnce({
      error: { message: "resend down" },
    });

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.EMAIL_SEND_FAILED,
    });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it("throws EMAIL_SEND_FAILED when email kind is disabled", async () => {
    const participant = makeParticipant({
      isTeamLeader: true,
      email: "leader@example.com",
    });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindMany.mockResolvedValueOnce([]);
    mockSendEmail.mockResolvedValueOnce({
      id: "skipped",
      kindDisabled: true,
    });

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.EMAIL_SEND_FAILED,
    });
    expect(mockDelete).toHaveBeenCalled();
  });

  it("does NOT send email when rate-limited", async () => {
    const participant = makeParticipant({
      isTeamLeader: true,
      email: "l@e.com",
    });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindMany.mockResolvedValueOnce(new Array(5).fill({ id: "x" }));

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/too many/i) });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("rejects team leader without email", async () => {
    const participant = makeParticipant({ isTeamLeader: true, email: null });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rate-limits more than 5 OTP requests per 10 minutes", async () => {
    const participant = makeParticipant({
      isTeamLeader: true,
      email: "l@e.com",
    });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindMany.mockResolvedValueOnce(new Array(5).fill({ id: "x" }));

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/too many/i) });
  });

  it("hides debugOtp when NODE_ENV is production", async () => {
    const prevEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
      writable: true,
      enumerable: true,
    });
    try {
      const participant = makeParticipant({
        isTeamLeader: true,
        email: "leader@example.com",
      });
      mockParticipantFindFirst.mockResolvedValueOnce(participant);
      mockOtpFindMany.mockResolvedValueOnce([]);

      const result = await ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: group.id,
      });
      expect(result.status).toBe("OTP_REQUIRED");
      if (result.status === "OTP_REQUIRED") {
        expect(result.debugOtp).toBeUndefined();
      }
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: prevEnv,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }
  });
});

describe("ParticipantLoginService.verifyOtp", () => {
  it("throws when participant is not a team leader", async () => {
    const participant = makeParticipant({ isTeamLeader: false });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);

    await expect(
      ParticipantLoginService.verifyOtp({
        festivalSlug: festival.slug,
        participantSlug: participant.profileSlug,
        otp: "123456",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects unknown / expired OTP", async () => {
    const participant = makeParticipant({ isTeamLeader: true });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindFirst.mockResolvedValueOnce(null);

    await expect(
      ParticipantLoginService.verifyOtp({
        festivalSlug: festival.slug,
        participantSlug: participant.profileSlug,
        otp: "123456",
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/invalid/i) });
  });

  it("increments attempts and rejects on wrong code", async () => {
    const participant = makeParticipant({ isTeamLeader: true });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindFirst.mockResolvedValueOnce({
      id: "otp-1",
      codeHash: crypto.createHash("sha256").update("000000").digest("hex"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      consumedAt: null,
    });

    await expect(
      ParticipantLoginService.verifyOtp({
        festivalSlug: festival.slug,
        participantSlug: participant.profileSlug,
        otp: "123456",
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("mints session on correct OTP", async () => {
    const participant = makeParticipant({ isTeamLeader: true });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindFirst.mockResolvedValueOnce({
      id: "otp-1",
      codeHash: crypto.createHash("sha256").update("123456").digest("hex"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      consumedAt: null,
    });

    const result = await ParticipantLoginService.verifyOtp({
      festivalSlug: festival.slug,
      participantSlug: participant.profileSlug,
      otp: "123456",
    });

    expect(result.rawToken).toBe("mock-raw-token");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("locks out after OTP_MAX_ATTEMPTS", async () => {
    const participant = makeParticipant({ isTeamLeader: true });
    mockParticipantFindFirst.mockResolvedValueOnce(participant);
    mockOtpFindFirst.mockResolvedValueOnce({
      id: "otp-1",
      codeHash: "anything",
      attempts: 5,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      consumedAt: null,
    });

    await expect(
      ParticipantLoginService.verifyOtp({
        festivalSlug: festival.slug,
        participantSlug: participant.profileSlug,
        otp: "123456",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("ParticipantLoginService.revokeSessionByRawToken", () => {
  it("updates the matching session with revokedAt", async () => {
    await ParticipantLoginService.revokeSessionByRawToken("raw-token");
    expect(mockUpdate).toHaveBeenCalled();
  });
});
