"use client";

import {
  AlertCircle,
  Check,
  CloudUpload,
  Download,
  Edit2,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import party from "party-js";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/core/utils/cn";
import { toast } from "@/lib/toast";

// --- Types ---

export interface ParsedItem<T> {
  id: string; // Internal ID for tracking
  originalRowIndex: number;
  data: T;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BulkUploadFlowProps<T> {
  trigger?: React.ReactNode;
  title: string;
  templateHeaders: string[];
  templateData: any[][];
  templateName?: string;
  description?: string;

  // Logic
  parseRow: (
    row: any[],
    index: number,
  ) => ParsedItem<T> | Promise<ParsedItem<T>>;
  validateRows?: (items: ParsedItem<T>[]) => Promise<ParsedItem<T>[]>; // Optional batch validation
  onCommit: (
    validItems: T[],
  ) => Promise<{
    success: boolean;
    count?: number;
    successCount?: number;
    error?: string;
    errors?: any[];
  }>;

  // UI Rendering
  columns: {
    header: string;
    cell: (item: T) => React.ReactNode;
    width?: string;
  }[];

  // Edit Component
  EditComponent: React.ComponentType<{
    data: T;
    onSave: (updated: T) => void;
    onCancel: () => void;
  }>;
}

type UploadStep = "INSTRUCTIONS" | "UPLOAD" | "VALIDATION" | "COMPLETION";

const STEPS: { id: UploadStep; label: string }[] = [
  { id: "INSTRUCTIONS", label: "Prepare" },
  { id: "UPLOAD", label: "Upload" },
  { id: "VALIDATION", label: "Review" },
  { id: "COMPLETION", label: "Done" },
];

export function BulkUploadFlow<T>({
  trigger,
  title,
  description,
  templateHeaders,
  templateData,
  templateName = "template.xlsx",
  parseRow,
  validateRows,
  onCommit,
  columns,
  EditComponent,
}: BulkUploadFlowProps<T>) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("INSTRUCTIONS");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedItem<T>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    success: number;
    failed: number;
    message?: string;
    errors?: any[];
  }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const resetState = () => {
    setStep("INSTRUCTIONS");
    setFile(null);
    setParsedData([]);
    setIsProcessing(false);
    setResultSummary({ success: 0, failed: 0 });
    setEditingItemId(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(resetState, 300);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...templateData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, templateName);
    toast.success("Template downloaded");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    parseFile(uploadedFile);
  };

  const parseFile = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const rows = jsonData.slice(1) as any[][]; // Skip header

        const parsedResults: ParsedItem<T>[] = [];
        for (let i = 0; i < rows.length; i++) {
          // Skip empty rows
          if (rows[i].length === 0 || rows[i].every((cell) => !cell)) continue;

          const parsed = await parseRow(rows[i], i);
          // Ensure ID is present if not provided by parseRow (though interface says so)
          if (!parsed.id) parsed.id = uuidv4();
          parsedResults.push(parsed);
        }

        let finalResults = parsedResults;
        if (validateRows) {
          finalResults = await validateRows(parsedResults);
        }

        setParsedData(finalResults);
        setStep("VALIDATION");
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse file.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleUpdateItem = async (id: string, updatedData: T) => {
    // Add a small artificial delay for better UX/feedback
    await new Promise((resolve) => setTimeout(resolve, 500));
    setParsedData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            data: updatedData,
            isValid: true, // Optimistic validity upon manual correction
            errors: [],
          };
        }
        return item;
      }),
    );
    setEditingItemId(null);
    toast.success("Row updated");
  };

  const handleDeleteItem = (id: string) => {
    setParsedData((prev) => prev.filter((p) => p.id !== id));
    toast.success("Row removed");
  };

  const handleCommit = async () => {
    setIsProcessing(true);
    const validItems = parsedData.filter((p) => p.isValid).map((p) => p.data);

    try {
      const result = await onCommit(validItems);
      if (result.success) {
        const count = result.count ?? result.successCount ?? 0;
        setResultSummary({
          success: count,
          failed: parsedData.length - count,
          message: result.error,
          errors: result.errors,
        });
        setStep("COMPLETION");
      } else {
        toast.error(result.error || "Batch upload failed");
      }
    } catch (e) {
      console.error("Bulk upload failed", e);
      toast.error("Bulk upload failed unexpected.");
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedData.filter((p) => p.isValid).length;
  const errorCount = parsedData.filter((p) => !p.isValid).length;
  const warningCount = parsedData.reduce(
    (count, item) => count + (item.warnings?.length ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[100dvw] sm:w-full h-[100dvh] sm:h-[85vh] sm:max-h-[850px] max-w-none sm:max-w-5xl p-0 gap-0 overflow-hidden rounded-none sm:rounded-xl border-none shadow-none sm:shadow-2xl bg-background flex flex-col outline-none z-50">
        <DialogHeader className="px-6 py-4 border-b bg-background shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4 flex-col items-start gap-1">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              Bulk upload your spreadsheet, review and fix any validation
              errors, then commit the valid rows.
            </DialogDescription>
          </div>
          <div className="flex gap-2 absolute left-1/2 -translate-x-1/2">
            {STEPS.map((s, idx) => {
              const isCurrent = step === s.id;
              const isPast = STEPS.findIndex((x) => x.id === step) > idx;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center px-3 py-1 rounded-full text-xs font-semibold max-sm:hidden transition-all",
                    isCurrent
                      ? "bg-primary/10 text-primary border border-primary/20 scale-105 shadow-sm"
                      : isPast
                        ? "bg-muted text-muted-foreground opacity-50"
                        : "opacity-30",
                  )}
                >
                  <span className="mr-2 flex items-center justify-center bg-current text-[8px] text-background w-3.5 h-3.5 rounded-full">
                    {idx + 1}
                  </span>{" "}
                  {s.label}
                </div>
              );
            })}
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </DialogHeader>

        <div className="flex-1 flex flex-col bg-background min-h-0 relative">
          {(step === "INSTRUCTIONS" || step === "UPLOAD") && (
            <div className="flex flex-col items-center justify-center p-4 sm:p-8 h-full animate-in fade-in duration-500 bg-background overflow-y-auto">
              <div className="w-full max-w-3xl text-center space-y-8 my-auto">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <CloudUpload className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
                  <p className="text-muted-foreground text-base max-w-md mx-auto">
                    {description ||
                      "Upload your spreadsheet to easily import multiple records at once."}
                    <br />
                    Supported formats: .xlsx, .csv
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 relative text-left">
                  {/* Step 1 Module */}
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="group relative flex flex-col items-center text-center space-y-3 p-6 sm:p-8 rounded-2xl border border-dashed border-primary/20 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md w-full"
                  >
                    <div className="w-12 h-12 bg-background text-primary rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-sm">
                      <Download className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-primary">
                        Step 1
                      </div>
                      <h3 className="font-semibold text-lg">
                        Download Template
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-[200px] whitespace-normal">
                      Get the template spreadsheet. Do not remove the headers.
                    </p>
                  </button>

                  {/* Step 2 Module */}
                  <button
                    type="button"
                    onClick={() =>
                      !isProcessing && fileInputRef.current?.click()
                    }
                    disabled={isProcessing}
                    className={cn(
                      "group relative flex flex-col items-center text-center space-y-3 p-6 sm:p-8 rounded-2xl border border-dashed border-primary/20 bg-muted/20 transition-all duration-300 shadow-sm w-full",
                      isProcessing
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:border-primary/50 hover:bg-primary/5 cursor-pointer hover:shadow-md",
                    )}
                  >
                    <div className="w-12 h-12 bg-background text-primary rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-sm">
                      {isProcessing ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-primary">
                        Step 2
                      </div>
                      <h3 className="font-semibold text-lg">Upload File</h3>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-normal">
                      Upload your filled spreadsheet.
                    </p>
                    <div className="flex gap-2 justify-center mt-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold bg-background text-primary"
                      >
                        .XLSX
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold bg-background text-primary"
                      >
                        .CSV
                      </Badge>
                    </div>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
          )}

          {step === "VALIDATION" && (
            <div className="flex flex-col h-full bg-muted/10 min-h-0 animate-in slide-in-from-right-10 duration-300">
              <div className="px-4 py-3 sm:px-8 sm:py-4 flex flex-row flex-wrap sm:flex-nowrap items-center justify-between border-b bg-background/50 backdrop-blur-sm shrink-0 sticky top-0 z-20 gap-2">
                <div className="flex flex-row flex-wrap items-center gap-1.5 sm:gap-4">
                  <Badge
                    variant="outline"
                    className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm gap-1 sm:gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-500 whitespace-nowrap flex items-center"
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" /> {validCount} Valid
                  </Badge>
                  {errorCount > 0 && (
                    <Badge
                      variant="outline"
                      className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm gap-1 sm:gap-2 border-red-500/20 bg-red-500/10 text-red-500 whitespace-nowrap flex items-center"
                    >
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" /> {errorCount} Errors
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge
                      variant="outline"
                      className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm gap-1 sm:gap-2 border-amber-500/20 bg-amber-500/10 text-amber-600 whitespace-nowrap flex items-center"
                    >
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" /> {warningCount} Warnings
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setStep("INSTRUCTIONS");
                  }}
                  className="shrink-0 h-8 px-2 sm:px-3"
                >
                  Reset
                </Button>
              </div>

              <div className="flex-1 overflow-hidden p-4 sm:p-6">
                <div className="border rounded-xl bg-background shadow-sm h-full flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1">
                    {/* Desktop Table View */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[80px] text-center font-bold">
                              #
                            </TableHead>
                            {columns.map((col, idx) => (
                              <TableHead
                                key={idx}
                                className="font-bold whitespace-nowrap"
                                style={{ width: col.width }}
                              >
                                {col.header}
                              </TableHead>
                            ))}
                            <TableHead className="font-bold w-[150px]">
                              Status
                            </TableHead>
                            <TableHead className="text-right font-bold w-[120px]">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...parsedData]
                            .sort((a, b) =>
                              a.isValid === b.isValid ? 0 : a.isValid ? -1 : 1,
                            )
                            .map((row) => (
                              <TableRow
                                key={row.id}
                                className={cn(
                                  "group transition-colors",
                                  !row.isValid
                                    ? "bg-red-500/5 hover:bg-red-500/10"
                                    : "hover:bg-muted/50",
                                )}
                              >
                                <TableCell className="text-center font-mono text-xs text-muted-foreground w-[80px] py-2">
                                  {row.originalRowIndex + 2}
                                </TableCell>
                                {columns.map((col, cIdx) => (
                                  <TableCell key={cIdx} className="py-2">
                                    {col.cell(row.data)}
                                  </TableCell>
                                ))}
                                
                                <TableCell className="w-[150px] py-2">
                                  <div className="flex flex-col gap-1.5">
                                    {row.isValid && (
                                      <div className="text-xs text-emerald-500 font-medium flex items-center gap-1.5 bg-emerald-500/10 w-fit px-2 py-1 rounded-full border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />{" "}
                                        Ready
                                      </div>
                                    )}
                                    {row.errors.map((err, i) => (
                                      <span
                                        key={`error-${i}`}
                                        className="text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border shadow-sm uppercase tracking-tight leading-none text-red-600 bg-red-500/10 border-red-500/30"
                                      >
                                        <AlertCircle className="h-3 w-3 shrink-0 text-red-600" />{" "}
                                        {err}
                                      </span>
                                    ))}
                                    {row.warnings?.map((warning, i) => (
                                      <span
                                        key={`warning-${i}`}
                                        className="text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border shadow-sm uppercase tracking-tight leading-none text-amber-600 bg-amber-500/10 border-amber-500/30"
                                      >
                                        <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />{" "}
                                        {warning}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right w-[120px] py-2">
                                  <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => setEditingItemId(row.id)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleDeleteItem(row.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="sm:hidden flex flex-col gap-4 p-4">
                      {[...parsedData]
                        .sort((a, b) =>
                          a.isValid === b.isValid ? 0 : a.isValid ? -1 : 1,
                        )
                        .map((row) => (
                          <div
                            key={row.id}
                            className={cn(
                              "flex flex-col gap-3 p-4 rounded-xl border shadow-sm",
                              !row.isValid
                                ? "bg-red-500/5 border-red-500/20"
                                : "bg-card border-border",
                            )}
                          >
                            <div className="flex items-center justify-between border-b border-border/50 pb-3">
                              <div className="font-mono text-xs font-medium text-muted-foreground">
                                Row {row.originalRowIndex + 2}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                  onClick={() => setEditingItemId(row.id)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteItem(row.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                              {columns.map((col, cIdx) => (
                                <div key={cIdx} className="flex flex-col gap-1">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                    {col.header}
                                  </span>
                                  <div className="font-medium break-words text-sm">
                                    {col.cell(row.data)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-col gap-2 pt-3 border-t border-border/50">
                              {row.isValid && (
                                <div className="text-xs text-emerald-500 font-medium flex items-center gap-1.5 bg-emerald-500/10 w-fit px-2 py-1 rounded-full border border-emerald-500/20">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />{" "}
                                  Ready
                                </div>
                              )}
                              {row.errors.map((err, i) => (
                                <span
                                  key={`error-${i}`}
                                  className="text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-sm uppercase tracking-tight leading-none text-red-600 bg-red-500/10 border-red-500/30"
                                >
                                  <AlertCircle className="h-3 w-3 shrink-0 text-red-600" />{" "}
                                  {err}
                                </span>
                              ))}
                              {row.warnings?.map((warning, i) => (
                                <span
                                  key={`warning-${i}`}
                                  className="text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-sm uppercase tracking-tight leading-none text-amber-600 bg-amber-500/10 border-amber-500/30"
                                >
                                  <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />{" "}
                                  {warning}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {step === "COMPLETION" && (
            <CompletionStep
              success={resultSummary.success}
              failed={resultSummary.failed}
              errors={resultSummary.errors}
              onClose={() => setOpen(false)}
              onReset={resetState}
            />
          )}

          {/* Edit Dialog/Sheet - Rendered conditionally */}
          {editingItemId && (
            <Dialog
              open={!!editingItemId}
              onOpenChange={(o) => !o && setEditingItemId(null)}
            >
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Edit Row</DialogTitle>
                  <DialogDescription className="sr-only">
                    Edit the values for this row, then save to return to the
                    review table.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {(() => {
                    const item = parsedData.find((p) => p.id === editingItemId);
                    if (!item) return null;
                    return (
                      <EditComponent
                        key={item.id}
                        data={item.data}
                        onSave={(updated) => handleUpdateItem(item.id, updated)}
                        onCancel={() => setEditingItemId(null)}
                      />
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {step !== "COMPLETION" && (
          <div className="px-4 py-3 border-t bg-background shrink-0 flex flex-row items-center justify-between w-full gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {step === "VALIDATION" && (
              <div className="flex flex-row items-center gap-2">
                {warningCount > 0 && errorCount === 0 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setParsedData((prev) =>
                        prev.map((item) => ({ ...item, warnings: [] })),
                      )
                    }
                    disabled={isProcessing}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  >
                    Skip Warnings
                  </Button>
                )}
                <Button
                  onClick={handleCommit}
                  disabled={errorCount > 0 || validCount === 0 || isProcessing}
                  className="pl-4 pr-4 sm:pl-6 sm:pr-8 h-9 sm:h-10 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="mr-2 h-4 w-4" />
                  )}
                  Import {validCount} Items
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompletionStep({
  success,
  failed,
  errors,
  onClose,
  onReset,
}: {
  success: number;
  failed: number;
  errors?: any[];
  onClose: () => void;
  onReset: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    party.confetti(el, {
      count: party.variation.range(40, 60),
      spread: party.variation.range(40, 50),
    });
  }, []);

  const downloadErrorsCsv = () => {
    if (!errors || errors.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(errors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Errors");
    XLSX.writeFile(wb, "failed_rows.xlsx");
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center space-y-6 p-6 sm:p-8 text-center h-full animate-in fade-in zoom-in-95 duration-500"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-100 blur-lg rounded-full opacity-50 animate-pulse" />
        <div className="h-20 w-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center relative shadow-sm border border-emerald-100">
          <Check className="h-10 w-10" />
        </div>
      </div>

      <div className="space-y-1 max-w-md w-full">
        <h3 className="text-3xl font-bold tracking-tight text-green-500">
          Import Complete!
        </h3>
        <p className="text-muted-foreground text-lg">
          Successfully imported{" "}
          <span className="text-foreground font-semibold">{success}</span>{" "}
          items.
          {failed > 0 && (
            <span className="block text-red-600 text-sm mt-2 font-medium">
              {failed} items were skipped or failed.
            </span>
          )}
        </p>

        {errors && errors.length > 0 && (
          <div className="mt-6 p-4 border border-red-200 bg-red-50 rounded-lg text-left shadow-sm">
            <h4 className="text-sm font-semibold text-red-800 mb-2">
              Failed Rows Summary
            </h4>
            <div className="max-h-32 overflow-y-auto text-xs text-red-700 space-y-1">
              {errors.slice(0, 10).map((err, i) => (
                <div key={i}>
                  • {err.name || "Unknown row"}: {err.error}
                </div>
              ))}
              {errors.length > 10 && (
                <div className="font-semibold mt-1">
                  ...and {errors.length - 10} more.
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
              onClick={downloadErrorsCsv}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Failed Rows
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 mt-8">
        <Button
          onClick={onClose}
          variant="outline"
          size="lg"
          className="min-w-[150px]"
        >
          Close
        </Button>
        <Button onClick={onReset} size="lg" className="min-w-[150px]">
          Upload More
        </Button>
      </div>
    </div>
  );
}
