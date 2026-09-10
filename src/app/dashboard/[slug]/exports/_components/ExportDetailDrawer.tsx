"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRelative } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { ExportConfig } from "@/features/exports/schemas/export-config.schema";
import type { ExportListItem } from "@/features/exports/types/export.types";
import { toast } from "@/lib/toast";
import { summarizeIssue } from "./export-issues-banner.logic";
import { displayFormat, getExportTypeMeta } from "./export-types";

interface ExportDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ExportListItem | null;
}

const GENDER_LABEL: Record<string, string> = {
  ALL: "All",
  MALE: "Male",
  FEMALE: "Female",
};

const PRINT_LAYOUT_LABEL: Record<string, string> = {
  ONE_PER_PAGE: "One per page",
  MULTIPLE_PER_PAGE: "Multi-up (grid)",
};

const FIT_LABEL: Record<string, string> = {
  FIT: "Fit (with margin)",
  FILL: "Fill (edge-to-edge)",
};

const CERT_TYPE_LABEL: Record<string, string> = {
  PARTICIPATION: "Participation",
  FIRST: "1st Place",
  SECOND: "2nd Place",
  THIRD: "3rd Place",
  COMMON_PRIZE: "Common Prize",
  GRADE: "Grade",
};

function downloadUrl(id: string): string {
  return `/api/v1/exports/${id}/download`;
}

function saveBlob(blob: Blob, fileName: string | null) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  if (fileName) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatusBadge({ status }: { status: ExportListItem["status"] }) {
  if (status === "COMPLETED")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    );
  if (status === "PROCESSING")
    return (
      <Badge variant="warning" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      Failed
    </Badge>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-words">
        {value}
      </span>
    </div>
  );
}

interface ZipEntry {
  name: string;
  kind: "pdf" | "ai";
  label: string;
}

/**
 * The ZIP bundle always ships a printable PDF and an `.ai` (PDF wrapper,
 * same content under a different extension — Illustrator opens it as a
 * multi-artboard PDF). We list both here so the export details drawer
 * doesn't leave the user wondering what they unzipped into.
 */
function zipContents(zipName: string, _type: string | undefined): ZipEntry[] {
  const baseName = zipName.replace(/\.zip$/i, "");
  return [
    {
      name: `${baseName}.pdf`,
      kind: "pdf",
      label: "Printable PDF",
    },
    {
      name: `${baseName}.ai`,
      kind: "ai",
      label: "Adobe Illustrator (PDF wrapper)",
    },
  ];
}

function FileIcon({
  kind,
  className,
}: {
  kind: ZipEntry["kind"];
  className?: string;
}) {
  if (kind === "pdf") return <FileText className={className} />;
  return <FileImage className={className} />;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
        {title}
      </h4>
      <div className="rounded-md border bg-card/40 px-3 py-2">{children}</div>
    </div>
  );
}

function NameList({ names }: { names: string[] }) {
  if (names.length === 0)
    return <span className="text-muted-foreground/50">None</span>;
  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {names.map((n) => (
        <Badge key={n} variant="outline" className="font-normal">
          {n}
        </Badge>
      ))}
    </div>
  );
}

function formatBytes(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return "< 1 second";
  const seconds = Math.round(ms / 1000);
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

/** Render the config-discriminated-union as a list of labelled rows. */
function ConfigSections({
  config,
  templateName,
  teamNames,
  categoryNames,
  programmeNames,
  stageNames,
}: {
  config: ExportConfig;
  templateName: string | null;
  teamNames: string[];
  categoryNames: string[];
  programmeNames: string[];
  stageNames: string[];
}) {
  const lines: Array<{ label: string; value: React.ReactNode }> = [];

  // Shared fields (BADGE / CERTIFICATE)
  if (config.type === "BADGE" || config.type === "CERTIFICATE") {
    lines.push({
      label: "Template",
      value: templateName ?? (
        <span className="text-muted-foreground/50">Unknown</span>
      ),
    });
    lines.push({ label: "Quality", value: config.quality.toLowerCase() });
    if (config.type === "BADGE") {
      lines.push({
        label: "Print Layout",
        value: PRINT_LAYOUT_LABEL[config.printLayout] ?? config.printLayout,
      });
    }
    lines.push({ label: "Page Size", value: config.pageSize });
    lines.push({ label: "Orientation", value: config.pageOrientation });
    if (config.type === "BADGE" && config.printLayout === "MULTIPLE_PER_PAGE") {
      lines.push({
        label: "Grid",
        value: config.multiGrid === "AUTO" ? "Auto" : config.multiGrid,
      });
    }
    lines.push({ label: "Fit", value: FIT_LABEL[config.fit] ?? config.fit });
    lines.push({ label: "Margin", value: `${config.marginMm} mm` });
    if (config.type === "BADGE" && config.printLayout === "MULTIPLE_PER_PAGE") {
      lines.push({ label: "Gutter", value: `${config.gutterMm} mm` });
    }
    lines.push({ label: "Bleed", value: `${config.bleedMm} mm` });
    lines.push({
      label: "Crop marks",
      value: config.drawCropMarks ? "Yes" : "No",
    });
    lines.push({
      label: "Output format",
      value:
        config.outputFormat === "AI"
          ? "AI (PDF wrapper)"
          : config.outputFormat === "BOTH"
            ? "PDF + AI (zip)"
            : "PDF",
    });
  }

  // Gender filters (BADGE, CALL_LIST, RESULTS, TEAM_RESULT, VALUATION_SHEET)
  if (
    config.type === "BADGE" ||
    config.type === "CALL_LIST" ||
    config.type === "RESULTS" ||
    config.type === "TEAM_RESULT" ||
    config.type === "VALUATION_SHEET"
  ) {
    lines.push({
      label: "Gender",
      value: GENDER_LABEL[config.gender] ?? config.gender,
    });
  }

  if (config.type === "BADGE") {
    lines.push({
      label: "Only chest-numbered",
      value: config.onlyWithChestNumber ? "Yes" : "No",
    });
  }

  if (config.type === "CALL_LIST") {
    lines.push({
      label: "Only with participants",
      value: config.onlyWithParticipants ? "Yes" : "No",
    });
    lines.push({
      label: "List type",
      value: config.listType.toLowerCase().replace("_", "-"),
    });
    lines.push({
      label: "Programme type",
      value: config.programmeType.toLowerCase(),
    });
    lines.push({
      label: "Schedule state",
      value: config.scheduleState.toLowerCase(),
    });
    lines.push({
      label: "Sort by",
      value: config.sortBy.toLowerCase().replace("_", " "),
    });
    lines.push({
      label: "Include chest #",
      value: config.includeChestNumber ? "Yes" : "No",
    });
    lines.push({
      label: "Include category",
      value: config.includeCategory ? "Yes" : "No",
    });
    lines.push({
      label: "Include team",
      value: config.includeTeam ? "Yes" : "No",
    });
    lines.push({
      label: "Include stage",
      value: config.includeStage ? "Yes" : "No",
    });
    lines.push({
      label: "Include DOB",
      value: config.includeDob ? "Yes" : "No",
    });
    lines.push({
      label: "Include phone",
      value: config.includePhone ? "Yes" : "No",
    });
    lines.push({
      label: "Include signature",
      value: config.includeSignatureLine ? "Yes" : "No",
    });
    lines.push({
      label: "Include remarks",
      value: config.includeRemarks ? "Yes" : "No",
    });
  }

  if (config.type === "RESULTS") {
    lines.push({
      label: "List type",
      value: config.listType.toLowerCase().replace("_", "-"),
    });
    lines.push({
      label: "Only published",
      value: config.onlyPublished ? "Yes" : "No",
    });
    lines.push({
      label: "Include code letter",
      value: config.includeCodeLetter ? "Yes" : "No",
    });
    lines.push({
      label: "Include grades",
      value: config.includeGrades ? "Yes" : "No",
    });
    lines.push({
      label: "Include points",
      value: config.includePoints ? "Yes" : "No",
    });
    lines.push({
      label: "Include judge reports",
      value: config.includeJudgeReports ? "Yes" : "No",
    });
    lines.push({
      label: "Include DOB",
      value: config.includeDob ? "Yes" : "No",
    });
    lines.push({
      label: "Include phone",
      value: config.includePhone ? "Yes" : "No",
    });
    lines.push({ label: "Start result #", value: config.startResultNumber });
    if (config.endResultNumber)
      lines.push({ label: "End result #", value: config.endResultNumber });
  }

  if (config.type === "TEAM_RESULT") {
    lines.push({
      label: "Only published",
      value: config.onlyPublished ? "Yes" : "No",
    });
    lines.push({
      label: "Include award points",
      value: config.includeAwardPoints ? "Yes" : "No",
    });
  }

  if (config.type === "JUDGE_LIST") {
    lines.push({
      label: "Grouping",
      value: config.grouping.toLowerCase().replace("_", "-"),
    });
    lines.push({
      label: "Layout",
      value: config.layout.toLowerCase().replace("_", "-"),
    });
    lines.push({
      label: "Include description",
      value: config.includeDescription ? "Yes" : "No",
    });
  }

  if (config.type === "VALUATION_SHEET") {
    lines.push({
      label: "Include code letters",
      value: config.includeCodeLetters ? "Yes" : "No",
    });
    lines.push({
      label: "Include group",
      value: config.includeGroup ? "Yes" : "No",
    });
  }

  if (config.type === "CERTIFICATE") {
    lines.push({
      label: "Certificate types",
      value: (
        <div className="flex flex-wrap gap-1 justify-end">
          {config.certificateTypes.map((t) => (
            <Badge key={t} variant="outline" className="font-normal">
              {CERT_TYPE_LABEL[t] ?? t}
            </Badge>
          ))}
        </div>
      ),
    });
  }

  if (config.type === "SCHEDULE") {
    lines.push({
      label: "Days",
      value: config.days.length === 0 ? "All" : `${config.days.length} day(s)`,
    });
    lines.push({
      label: "Time display",
      value: config.timeDisplay.toLowerCase().replace("_", " "),
    });
    lines.push({
      label: "Include stage",
      value: config.includeStage ? "Yes" : "No",
    });
    lines.push({
      label: "Include description",
      value: config.includeDescription ? "Yes" : "No",
    });
    lines.push({
      label: "Include speakers",
      value: config.includeSpeakers ? "Yes" : "No",
    });
    lines.push({
      label: "Include entry type",
      value: config.includeEntryType ? "Yes" : "No",
    });
  }

  const showTeam =
    teamNames.length > 0 || ("teamIds" in config && config.teamIds.length > 0);
  const showCategory =
    categoryNames.length > 0 ||
    ("categoryIds" in config && config.categoryIds.length > 0);
  const showProgramme =
    programmeNames.length > 0 ||
    ("programmeIds" in config && config.programmeIds.length > 0);
  const showStage =
    stageNames.length > 0 ||
    ("stageIds" in config && config.stageIds.length > 0);

  return (
    <div className="space-y-4">
      <Section title="Layout & Quality">
        {lines.slice(0, 8).map((l) => (
          <DetailRow key={l.label} label={l.label} value={l.value} />
        ))}
      </Section>

      {(config.type === "BADGE" || config.type === "CERTIFICATE") &&
        lines.length > 8 && (
          <Section title="Print Options">
            {lines.slice(8).map((l) => (
              <DetailRow key={l.label} label={l.label} value={l.value} />
            ))}
          </Section>
        )}

      {config.type !== "BADGE" && config.type !== "CERTIFICATE" && (
        <Section title="Filters">
          {lines
            .filter(
              (l) =>
                ![
                  "Layout",
                  "Quality",
                  "Print Layout",
                  "Page Size",
                  "Orientation",
                  "Grid",
                  "Fit",
                  "Margin",
                  "Gutter",
                  "Bleed",
                  "Crop marks",
                  "Include .ai bundle",
                  "Template",
                  "Gender",
                ].includes(l.label),
            )
            .map((l) => (
              <DetailRow key={l.label} label={l.label} value={l.value} />
            ))}
        </Section>
      )}

      {(showTeam || showCategory || showProgramme || showStage) && (
        <Section title="Scope">
          {showTeam && (
            <div className="flex items-start justify-between gap-3 py-1.5">
              <span className="text-xs text-muted-foreground shrink-0">
                Teams
              </span>
              <NameList names={teamNames} />
            </div>
          )}
          {showCategory && (
            <div className="flex items-start justify-between gap-3 py-1.5">
              <span className="text-xs text-muted-foreground shrink-0">
                Categories
              </span>
              <NameList names={categoryNames} />
            </div>
          )}
          {showProgramme && (
            <div className="flex items-start justify-between gap-3 py-1.5">
              <span className="text-xs text-muted-foreground shrink-0">
                Programmes
              </span>
              <NameList names={programmeNames} />
            </div>
          )}
          {showStage && (
            <div className="flex items-start justify-between gap-3 py-1.5">
              <span className="text-xs text-muted-foreground shrink-0">
                Stages
              </span>
              <NameList names={stageNames} />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

export function ExportDetailDrawer({
  open,
  onOpenChange,
  item,
}: ExportDetailDrawerProps) {
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);

  const handleStartDownload = useCallback(async () => {
    if (!item || downloading) return;
    setDownloading(true);
    setPercent(0);
    try {
      const res = await fetch(downloadUrl(item.id));
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const totalHeader = res.headers.get("Content-Length");
      const total = totalHeader ? Number(totalHeader) : 0;

      if (!res.body || !Number.isFinite(total) || total <= 0) {
        const blob = await res.blob();
        saveBlob(blob, item.fileName);
        return;
      }

      let received = 0;
      const tapped = res.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            received += chunk.byteLength;
            setPercent(Math.min(99, (received / total) * 100));
            controller.enqueue(chunk);
          },
        }),
      );
      const blob = await new Response(tapped).blob();
      setPercent(100);
      saveBlob(blob, item.fileName);
    } catch (err) {
      console.error("Export download failed", err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
      setTimeout(() => setPercent(0), 500);
    }
  }, [item, downloading]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col p-0 gap-0"
      >
        {item ? (
          <>
            <SheetHeader className="px-5 pb-4 border-b space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {(() => {
                    const meta = getExportTypeMeta(item.type);
                    const Icon = meta.icon;
                    return (
                      <>
                        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <SheetTitle className="truncate">
                          {meta.title}
                        </SheetTitle>
                      </>
                    );
                  })()}
                </div>
                <StatusBadge status={item.status} />
              </div>
              {item.summary && (
                <p className="text-sm text-muted-foreground">{item.summary}</p>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto py-4 px-5 space-y-5">
              {item.status === "FAILED" && item.errorMessage && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">
                      {summarizeIssue(item.errorMessage) ?? "Export failed"}
                    </p>
                    <details className="text-destructive/80">
                      <summary className="cursor-pointer select-none text-[11px]">
                        Technical details
                      </summary>
                      <p className="break-words mt-1 font-mono text-[11px]">
                        {item.errorMessage}
                      </p>
                    </details>
                  </div>
                </div>
              )}

              <Section title="Export">
                <DetailRow label="Format" value={displayFormat(item)} />
                <DetailRow
                  label="File name"
                  value={
                    item.fileName ?? (
                      <span className="text-muted-foreground/50">
                        Not yet generated
                      </span>
                    )
                  }
                />
                {displayFormat(item) === "ZIP" && item.fileName && (
                  <DetailRow
                    label="Contains"
                    value={
                      <ul className="space-y-0.5 text-right">
                        {zipContents(item.fileName, item.config?.type).map(
                          (entry) => (
                            <li
                              key={entry.name}
                              className="flex items-center justify-end gap-1.5"
                            >
                              <FileIcon
                                kind={entry.kind}
                                className="h-3 w-3 text-muted-foreground"
                              />
                              <span className="font-mono">{entry.name}</span>
                              <span className="text-muted-foreground/70">
                                · {entry.label}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    }
                  />
                )}
                <DetailRow
                  label="File size"
                  value={formatBytes(item.fileSizeBytes) ?? "—"}
                />
                <DetailRow label="Item count" value={item.itemCount ?? "—"} />
                <DetailRow
                  label="Duration"
                  value={formatDuration(item.completedInMs)}
                />
                <DetailRow
                  label="Queued"
                  value={formatRelative(item.queuedAt)}
                />
                {item.completedAt && (
                  <DetailRow
                    label="Completed"
                    value={formatRelative(item.completedAt)}
                  />
                )}
                <DetailRow
                  label="Expires"
                  value={formatRelative(item.expiresAt)}
                />
              </Section>

              {item.config ? (
                <ConfigSections
                  config={item.config}
                  templateName={item.templateName}
                  teamNames={item.selectedTeamNames}
                  categoryNames={item.selectedCategoryNames}
                  programmeNames={item.selectedProgrammeNames}
                  stageNames={item.selectedStageNames}
                />
              ) : (
                <Section title="Configuration">
                  <p className="text-xs text-muted-foreground">
                    Configuration could not be parsed (schema mismatch).
                  </p>
                </Section>
              )}

              <Separator />

              <p className="text-[10px] text-muted-foreground/70 font-mono break-all">
                {item.id}
              </p>
            </div>

            <div className="border-t p-4 flex items-center justify-end gap-2 bg-background">
              <Button
                onClick={handleStartDownload}
                disabled={item.status !== "COMPLETED" || downloading}
                className="gap-2"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading {Math.round(percent)}%
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            No export selected.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
