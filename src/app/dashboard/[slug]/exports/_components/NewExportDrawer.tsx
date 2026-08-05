"use client";

import { Check, Loader2, Settings2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
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
      onlyWithChestNumber: true,
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
      certificateTypes: ["PARTICIPATION"],
      categoryIds: [],
      programmeIds: [],
    };
  }
  try {
    return exportConfigSchema.parse({ type });
  } catch {
    return null;
  }
}

export function NewExportDrawer({
  festivalId,
  open,
  onOpenChange,
}: NewExportDrawerProps) {
  const [selectedType, setSelectedType] = useState<ExportTypeId>("CALL_LIST");
  const [format, setFormat] = useState<ExportFormat>("PDF");
  const [config, setConfig] = useState<ExportConfig | null>(() =>
    buildDefaultConfig("CALL_LIST"),
  );

  const createExport = useCreateExport();
  const meta = getExportTypeMeta(selectedType);

  const handleSelectType = (id: ExportTypeId) => {
    setSelectedType(id);
    setConfig(buildDefaultConfig(id));
    setFormat(getExportTypeMeta(id).formats[0]);
  };

  const handleExport = async () => {
    if (!config) {
      toast.error("This export type is coming soon.");
      return;
    }
    if (
      (config.type === "BADGE" || config.type === "CERTIFICATE") &&
      !config.templateId
    ) {
      toast.error("Select a template first.");
      return;
    }
    const parsed = exportConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Please complete the export options.");
      return;
    }
    const result = await createExport.mutateAsync({
      festivalId,
      format,
      config: parsed.data,
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
            {!config && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Filters for <span className="font-medium">{meta.title}</span>{" "}
                are coming soon.
              </div>
            )}
          </section>
        </div>

        {/* Footer */}

        <DrawerFooter className="flex items-center flex-row justify-end">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {(["PDF", "CSV"] as ExportFormat[]).map((f) => {
              const enabled = meta.formats.includes(f);
              return (
                <button
                  key={f}
                  type="button"
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
                  {f}
                </button>
              );
            })}
          </div>
          <Button
            onClick={handleExport}
            disabled={!meta.implemented || createExport.isPending}
          >
            {createExport.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Export {format}
          </Button>
        </DrawerFooter>
      </SheetContent>
    </Sheet>
  );
}
