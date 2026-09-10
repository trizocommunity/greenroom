import { describe, expect, it } from "vitest";
import type { ExportListItem } from "@/features/exports/types/export.types";
import {
  getBannerContent,
  RECENT_FAILURE_MS,
  STUCK_PROCESSING_MS,
  summarizeIssue,
} from "./export-issues-banner.logic";

function makeExport(overrides: Partial<ExportListItem>): ExportListItem {
  return {
    id: "exp-1",
    type: "BADGE",
    format: "PDF",
    status: "COMPLETED",
    summary: "Badge export",
    filterBadges: [],
    fileName: null,
    fileSizeBytes: null,
    itemCount: null,
    errorMessage: null,
    queuedAt: new Date().toISOString(),
    completedAt: null,
    completedInMs: null,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    templateName: null,
    selectedTeamNames: [],
    selectedCategoryNames: [],
    selectedProgrammeNames: [],
    selectedStageNames: [],
    config: null,
    ...overrides,
  };
}

describe("summarizeIssue", () => {
  it("matches the size-limit pattern emitted by the runner", () => {
    expect(
      summarizeIssue(
        "Export is 13 MB which exceeds the 4 MB Vercel Hobby Server Action body limit even at SCREEN quality. Please split the export into smaller batches by category or team.",
      ),
    ).toMatch(/too large/);
  });

  it("matches the upload-timeout / aborted pattern", () => {
    expect(
      summarizeIssue("Upload to storage timed out after 5 minutes."),
    ).toMatch(/timed out/);
    expect(summarizeIssue("Upload aborted.")).toMatch(/timed out/);
  });

  it("matches the 413 / failed-to-load pattern", () => {
    expect(summarizeIssue("Failed to load resource: 413")).toMatch(
      /couldn't upload/,
    );
  });

  it("matches the unexpected-response pattern", () => {
    expect(summarizeIssue("An unexpected response was received")).toMatch(
      /unexpected response/i,
    );
  });

  it("returns null for unknown error messages", () => {
    expect(summarizeIssue("Some unrelated server error")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(summarizeIssue(null)).toBeNull();
  });
});

describe("getBannerContent", () => {
  const now = Date.parse("2026-03-15T12:00:00.000Z");

  it("returns null when there are no exports", () => {
    expect(getBannerContent([], now)).toBeNull();
  });

  it("returns null when all exports are completed", () => {
    const exports = [makeExport({ status: "COMPLETED" })];
    expect(getBannerContent(exports, now)).toBeNull();
  });

  it("surfaces a recent failure with a known size-limit hint", () => {
    const queuedAt = new Date(now - 60 * 60 * 1000).toISOString();
    const exports = [
      makeExport({
        id: "exp-1",
        status: "FAILED",
        errorMessage:
          "Export is 105 MB which exceeds the 4 MB Vercel Hobby Server Action body limit even at SCREEN quality. Please split the export into smaller batches by category or team.",
        queuedAt,
      }),
    ];
    const content = getBannerContent(exports, now);
    expect(content).not.toBeNull();
    expect(content?.variant).toBe("failure");
    expect(content?.title).toBe("Export failed");
    expect(content?.description).toMatch(/too large/);
  });

  it("surfaces a recent 413 failure with a network hint", () => {
    const queuedAt = new Date(now - 5 * 60 * 1000).toISOString();
    const exports = [
      makeExport({
        status: "FAILED",
        errorMessage: "Failed to load resource: 413",
        queuedAt,
      }),
    ];
    const content = getBannerContent(exports, now);
    expect(content?.variant).toBe("failure");
    expect(content?.description).toMatch(/couldn't upload/);
  });

  it("surfaces an 'unexpected response' failure", () => {
    const queuedAt = new Date(now - 2 * 60 * 1000).toISOString();
    const exports = [
      makeExport({
        status: "FAILED",
        errorMessage: "An unexpected response was received from the server.",
        queuedAt,
      }),
    ];
    const content = getBannerContent(exports, now);
    expect(content?.variant).toBe("failure");
    expect(content?.description).toMatch(/unexpected response/i);
  });

  it("ignores failures older than the recent window", () => {
    const queuedAt = new Date(
      now - RECENT_FAILURE_MS - 60 * 60 * 1000,
    ).toISOString();
    const exports = [
      makeExport({
        status: "FAILED",
        errorMessage: "Export is 105 MB which exceeds the 100 MB limit.",
        queuedAt,
      }),
    ];
    expect(getBannerContent(exports, now)).toBeNull();
  });

  it("does not surface failures with unknown error messages as actionable", () => {
    const queuedAt = new Date(now - 60 * 60 * 1000).toISOString();
    const exports = [
      makeExport({
        status: "FAILED",
        errorMessage: "Some unknown internal error",
        queuedAt,
      }),
    ];
    // No size/network hint => falls through to stuck check, none here.
    expect(getBannerContent(exports, now)).toBeNull();
  });

  it("surfaces a stuck PROCESSING export", () => {
    const queuedAt = new Date(
      now - STUCK_PROCESSING_MS - 60 * 1000,
    ).toISOString();
    const exports = [makeExport({ status: "PROCESSING", queuedAt })];
    const content = getBannerContent(exports, now);
    expect(content?.variant).toBe("stuck");
    expect(content?.title).toContain("stuck");
  });

  it("pluralises the stuck title correctly", () => {
    const queuedAt = new Date(
      now - STUCK_PROCESSING_MS - 60 * 1000,
    ).toISOString();
    const exports = [
      makeExport({ id: "a", status: "PROCESSING", queuedAt }),
      makeExport({ id: "b", status: "PROCESSING", queuedAt }),
    ];
    const content = getBannerContent(exports, now);
    expect(content?.title).toMatch(/2.*stuck/);
  });

  it("does NOT surface a fresh PROCESSING export as stuck", () => {
    const queuedAt = new Date(now - 30 * 1000).toISOString();
    const exports = [makeExport({ status: "PROCESSING", queuedAt })];
    expect(getBannerContent(exports, now)).toBeNull();
  });

  it("does NOT surface a 5-minute PROCESSING upload as stuck (threshold is 10 min)", () => {
    // The banner should not compete with the runner's rendering work; only
    // genuinely-stuck jobs (over the 10-min threshold) get surfaced here.
    const queuedAt = new Date(now - 5 * 60 * 1000).toISOString();
    const exports = [makeExport({ status: "PROCESSING", queuedAt })];
    expect(getBannerContent(exports, now)).toBeNull();
  });

  it("prefers a recent actionable failure over a stuck job", () => {
    const stuckQueuedAt = new Date(
      now - STUCK_PROCESSING_MS - 60 * 1000,
    ).toISOString();
    const failureQueuedAt = new Date(now - 60 * 1000).toISOString();
    const exports = [
      makeExport({
        id: "stuck",
        status: "PROCESSING",
        queuedAt: stuckQueuedAt,
      }),
      makeExport({
        id: "failed",
        status: "FAILED",
        errorMessage:
          "Export is 200 MB which exceeds the 4 MB Vercel Hobby Server Action body limit even at SCREEN quality.",
        queuedAt: failureQueuedAt,
      }),
    ];
    const content = getBannerContent(exports, now);
    expect(content?.variant).toBe("failure");
  });
});
