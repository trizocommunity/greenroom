import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/core/errors/errors";

const mockFindFestivalBySlug = vi.fn();
const mockFindGroupsByFestival = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockOtpFindMany = vi.fn();
const mockOtpFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

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
      student: {
        findFirst: (...args: unknown[]) => mockStudentFindFirst(...args),
      },
      participantOtp: {
        findFirst: (...args: unknown[]) => mockOtpFindFirst(...args),
        findMany: (...args: unknown[]) => mockOtpFindMany(...args),
      },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("@/core/auth/participant-session", () => ({
  createRawSessionToken: () => "mock-raw-token",
  getSessionExpiryDate: () => new Date("2030-01-01T00:00:00.000Z"),
  getTokenHash: (t: string) =>
    crypto.createHash("sha256").update(t).digest("hex"),
}));

import { ParticipantLoginService } from "./participant-login.service";

const festival = { id: "fest-1", name: "Demo Fest", slug: "demo-fest" };
const group = { id: "group-1", name: "Al-Qurtuba" };

function makeStudent(overrides: Record<string, unknown> = {}) {
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
  mockStudentFindFirst.mockReset();
  mockOtpFindMany.mockReset();
  mockOtpFindFirst.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();

  mockFindFestivalBySlug.mockResolvedValue(festival);
  mockFindGroupsByFestival.mockResolvedValue([group]);

  mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  mockUpdate.mockReturnValue({
    set: vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
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

  it("throws STUDENT_NOT_FOUND when chest number does not match", async () => {
    mockStudentFindFirst.mockResolvedValueOnce(null);
    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "999",
        identifierKind: "GROUP",
        identifierValue: group.id,
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/student/i),
    });
  });

  it("returns AUTHENTICATED + session row when student matches by group", async () => {
    const student = makeStudent({ isTeamLeader: false });
    mockStudentFindFirst.mockResolvedValueOnce(student);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: festival.slug,
      chestNumber: "101",
      identifierKind: "GROUP",
      identifierValue: group.id,
    });

    expect(result.status).toBe("AUTHENTICATED");
    if (result.status === "AUTHENTICATED") {
      expect(result.studentSlug).toBe(student.profileSlug);
      expect(result.rawToken).toBe("mock-raw-token");
      expect(result.festivalName).toBe(festival.name);
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns AUTHENTICATED when student matches by date of birth", async () => {
    const student = makeStudent({ isTeamLeader: false });
    mockStudentFindFirst.mockResolvedValueOnce(student);

    const result = await ParticipantLoginService.requestAccess({
      festivalSlug: festival.slug,
      chestNumber: "101",
      identifierKind: "DOB",
      identifierValue: "2008-05-12T00:00:00.000Z",
    });

    expect(result.status).toBe("AUTHENTICATED");
  });

  it("throws STUDENT_NOT_FOUND when date of birth mismatches", async () => {
    const student = makeStudent({ isTeamLeader: false });
    mockStudentFindFirst.mockResolvedValueOnce(student);

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "DOB",
        identifierValue: "1999-01-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/student/i),
    });
  });

  it("throws STUDENT_NOT_FOUND when group does not match", async () => {
    const student = makeStudent({ isTeamLeader: false });
    mockStudentFindFirst.mockResolvedValueOnce(student);

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: "other-group-id",
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/student/i),
    });
  });

  it("throws when group id is not part of festival groups", async () => {
    const student = makeStudent({ isTeamLeader: false, groupId: "fake" });
    mockStudentFindFirst.mockResolvedValueOnce(student);

    await expect(
      ParticipantLoginService.requestAccess({
        festivalSlug: festival.slug,
        chestNumber: "101",
        identifierKind: "GROUP",
        identifierValue: "fake",
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/student/i),
    });
  });

  it("returns OTP_REQUIRED for team leader and stores an OTP hash", async () => {
    const student = makeStudent({
      isTeamLeader: true,
      email: "leader@example.com",
    });
    mockStudentFindFirst.mockResolvedValueOnce(student);
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
      expect(result.studentSlug).toBe(student.profileSlug);
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("rejects team leader without email", async () => {
    const student = makeStudent({ isTeamLeader: true, email: null });
    mockStudentFindFirst.mockResolvedValueOnce(student);

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
    const student = makeStudent({ isTeamLeader: true, email: "l@e.com" });
    mockStudentFindFirst.mockResolvedValueOnce(student);
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
      const student = makeStudent({
        isTeamLeader: true,
        email: "leader@example.com",
      });
      mockStudentFindFirst.mockResolvedValueOnce(student);
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
  it("throws when student is not a team leader", async () => {
    const student = makeStudent({ isTeamLeader: false });
    mockStudentFindFirst.mockResolvedValueOnce(student);

    await expect(
      ParticipantLoginService.verifyOtp({
        festivalSlug: festival.slug,
        studentSlug: student.profileSlug,
        otp: "123456",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects unknown / expired OTP", async () => {
    const student = makeStudent({ isTeamLeader: true });
    mockStudentFindFirst.mockResolvedValueOnce(student);
    mockOtpFindFirst.mockResolvedValueOnce(null);

    await expect(
      ParticipantLoginService.verifyOtp({
        festivalSlug: festival.slug,
        studentSlug: student.profileSlug,
        otp: "123456",
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/invalid/i) });
  });

  it("increments attempts and rejects on wrong code", async () => {
    const student = makeStudent({ isTeamLeader: true });
    mockStudentFindFirst.mockResolvedValueOnce(student);
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
        studentSlug: student.profileSlug,
        otp: "123456",
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("mints session on correct OTP", async () => {
    const student = makeStudent({ isTeamLeader: true });
    mockStudentFindFirst.mockResolvedValueOnce(student);
    mockOtpFindFirst.mockResolvedValueOnce({
      id: "otp-1",
      codeHash: crypto.createHash("sha256").update("123456").digest("hex"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      consumedAt: null,
    });

    const result = await ParticipantLoginService.verifyOtp({
      festivalSlug: festival.slug,
      studentSlug: student.profileSlug,
      otp: "123456",
    });

    expect(result.rawToken).toBe("mock-raw-token");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("locks out after OTP_MAX_ATTEMPTS", async () => {
    const student = makeStudent({ isTeamLeader: true });
    mockStudentFindFirst.mockResolvedValueOnce(student);
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
        studentSlug: student.profileSlug,
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
