"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { useCreateExport } from "@/api/client/exports";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/core/utils/cn";
import {
  type ExportConfig,
  exportConfigSchema,
} from "@/features/exports/schemas/export-config.schema";
import type { ExportFormat } from "@/features/exports/types/export.types";
import { toast } from "@/lib/toast";
import {
  EXPORT_TYPES,
  type ExportTypeId,
  getExportTypeMeta,
} from "./export-types";
import { BadgeFilters } from "./filters/BadgeFilters";
import { CallListFilters } from "./filters/CallListFilters";
import { CertificateFilters } from "./filters/CertificateFilters";
import { JudgeListFilters } from "./filters/JudgeListFilters";
import { ResultsFilters } from "./filters/ResultsFilters";
import { ScheduleFilters } from "./filters/ScheduleFilters";
import { TeamResultFilters } from "./filters/TeamResultFilters";
import { ValuationSheetFilters } from "./filters/ValuationSheetFilters";

interface NewExportDrawerProps {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Full default config for an export type (template types start unselected). */
function buildDefaultConfig(type: ExportTypeId): ExportConfig | null {
  if (type === "BADGE") {
    return {
      type: "BADGE",
      templateId: "",
      gender: "ALL",
      quality: "STANDARD",
      printLayout: "MULTIPLE_PER_PAGE",
      pageSize: "A4",
      pageOrientation: "PORTRAIT",
      multiGrid: "AUTO",
      fit: "FIT",
      marginMm: 3,
      gutterMm: 3,
      bleedMm: 0,
      drawCropMarks: false,
      onlyWithChestNumber: true,
      outputFormat: "PDF",
      categoryIds: [],
      teamIds: [],
    };
  }
  if (type === "CERTIFICATE") {
    return {
      type: "CERTIFICATE",
      templateId: "",
      quality: "STANDARD",
      printLayout: "ONE_PER_PAGE",
      pageSize: "A4",
      pageOrientation: "PORTRAIT",
      fit: "FIT",
      marginMm: 3,
      gutterMm: 3,
      bleedMm: 0,
      drawCropMarks: false,
      outputFormat: "PDF",
      certificateTypes: ["PARTICIPATION"],
      categoryIds: [],
      programmeIds: [],
    };
  }
  if (type === "SCHEDULE") {
    return {
      type: "SCHEDULE",
      days: [],
      timeDisplay: "START_AND_END",
      includeStage: true,
      includeDescription: true,
      includeSpeakers: false,
      includeEntryType: false,
    };
  }
  try {
    return exportConfigSchema.parse({ type });
  } catch {
    return null;
  }
}

/**
 * Returns a short, user-facing reason the export can't run yet, or null
 * when everything is valid. Single source of truth for the inline message
 * AND the disabled-button state.
 */
function validateExport(
  config: ExportConfig | null,
  implemented: boolean,
): string | null {
  if (!implemented) return "This export type isn't available yet.";
  if (!config) return "This export type isn't available yet.";
  if (config.type === "BADGE") {
    if (!config.templateId) return "Select a template.";
  }
  if (config.type === "CERTIFICATE") {
    if (!config.templateId) return "Select a template.";
    if (config.categoryIds.length === 0) return "Select one category.";
    if (config.programmeIds.length === 0) return "Select one programme.";
  }
  return null;
}

export function NewExportDrawer({
  festivalId,
  open,
  onOpenChange,
}: NewExportDrawerProps) {
  const [selectedType, setSelectedType] = useState<ExportTypeId>("CALL_LIST");
  // Format choice in the footer. For template exports (BADGE / CERTIFICATE)
  // this drives `config.outputFormat`; for data-driven exports it drives
  // the API's top-level `format`. "BOTH" is template-only.
  const [format, setFormat] = useState<ExportFormat | "BOTH">("PDF");
  const [config, setConfig] = useState<ExportConfig | null>(() =>
    buildDefaultConfig("CALL_LIST"),
  );

  const createExport = useCreateExport();
  const meta = getExportTypeMeta(selectedType);
  const validationError = validateExport(config, meta.implemented);

  const handleSelectType = (id: ExportTypeId) => {
    setSelectedType(id);
    setConfig(buildDefaultConfig(id));
    const firstFormat = getExportTypeMeta(id).formats[0];
    setFormat(firstFormat === "BOTH" ? "PDF" : firstFormat);
  };

  const handleExport = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!config) {
      toast.error("This export type is coming soon.");
      return;
    }
    const parsed = exportConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Please complete the export options.");
      return;
    }

    const finalConfig = { ...parsed.data };
    if (finalConfig.type === "SCHEDULE") {
      finalConfig.timezoneOffset = new Date().getTimezoneOffset();
    }
    // For template exports (BADGE / CERTIFICATE) the footer choice lives
    // inside the config (`outputFormat`). For data-driven exports the
    // choice stays in the top-level `format` field.
    if (finalConfig.type === "BADGE" || finalConfig.type === "CERTIFICATE") {
      finalConfig.outputFormat =
        format === "AI" || format === "BOTH" ? format : "PDF";
    }

    const result = await createExport.mutateAsync({
      festivalId,
      // For template exports the API's top-level `format` is always "PDF";
      // the actual on-disk format comes from `config.outputFormat`.
      format:
        finalConfig.type === "BADGE" || finalConfig.type === "CERTIFICATE"
          ? "PDF"
          : (format as ExportFormat),
      config: finalConfig,
    });
    if (result.status === "FAILED") {
      toast.error("Export failed to generate.");
    } else {
      toast.success("Export queued.");
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-1 pb-4 border-b">
          <SheetTitle>Create Export</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 px-1 space-y-6">
          {/* Export type picker */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Export Type</h3>
                <p className="text-xs text-muted-foreground">
                  Select the type of document you want to generate
                </p>
              </div>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 py-3 snap-x scrollbar-hide">
              {EXPORT_TYPES.map((t) => {
                const isSelected = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!t.implemented}
                    onClick={() => handleSelectType(t.id)}
                    className={cn(
                      "relative text-left rounded-lg border p-3 transition-colors shrink-0 w-[140px] sm:w-[160px] snap-start",
                      "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
                      isSelected &&
                        "border-primary ring-1 ring-primary bg-primary/5",
                      !t.implemented &&
                        "opacity-50 cursor-not-allowed hover:border-border",
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <t.icon className="h-5 w-5 text-muted-foreground mb-2" />
                    <div className="text-sm font-medium leading-tight">
                      {t.title}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {t.description}
                    </p>
                    {!t.implemented && (
                      <span className="mt-2 inline-block text-[10px] font-medium text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Configure filters */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Configure Filters</h3>
                <p className="text-xs text-muted-foreground">
                  Customize your export by selecting specific data
                </p>
              </div>
            </div>

            {config?.type === "CALL_LIST" && (
              <CallListFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {config?.type === "RESULTS" && (
              <ResultsFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {config?.type === "TEAM_RESULT" && (
              <TeamResultFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {config?.type === "JUDGE_LIST" && (
              <JudgeListFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {config?.type === "VALUATION_SHEET" && (
              <ValuationSheetFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {config?.type === "BADGE" && (
              <BadgeFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {config?.type === "CERTIFICATE" && (
              <CertificateFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {config?.type === "SCHEDULE" && (
              <ScheduleFilters
                festivalId={festivalId}
                value={config}
                onChange={setConfig}
              />
            )}
            {!config && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Filters for <span className="font-medium">{meta.title}</span>{" "}
                are coming soon.
              </div>
            )}
          </section>
        </div>

        {/* Footer: format selector + validation message + Export button */}
        <DrawerFooter className="flex flex-col gap-2 items-stretch border-t bg-background">
          {validationError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <fieldset
              className="flex items-center gap-1 rounded-md border p-0.5 border-solid"
              aria-label="Export format"
            >
              {meta.formats.map((f) => {
                const enabled = true;
                const label =
                  f === "BOTH" ? "Both (PDF + AI)" : f === "AI" ? "AI" : f;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={format === f}
                    disabled={!enabled}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "rounded px-3 py-2 text-xs font-medium transition-colors",
                      format === f
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground",
                      !enabled && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </fieldset>
            <Button
              onClick={handleExport}
              disabled={!!validationError || createExport.isPending}
            >
              {createExport.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Export {format === "BOTH" ? "Both" : format}
            </Button>
          </div>
        </DrawerFooter>
      </SheetContent>
    </Sheet>
  );
}
