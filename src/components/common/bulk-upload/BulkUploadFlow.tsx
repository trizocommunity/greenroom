"use client";

import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Download,
  Edit2,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

// --- Types ---

export interface ParsedItem<T> {
  id: string; // Internal ID for tracking
  originalRowIndex: number;
  data: T;
  isValid: boolean;
  errors: string[];
}

export interface BulkUploadFlowProps<T> {
  trigger?: React.ReactNode;
  title: string;
  templateHeaders: string[];
  templateData: any[][];
  templateName?: string;

  // Logic
  parseRow: (
    row: any[],
    index: number,
  ) => ParsedItem<T> | Promise<ParsedItem<T>>;
  validateRows?: (items: ParsedItem<T>[]) => Promise<ParsedItem<T>[]>; // Optional batch validation
  onCommit: (
    validItems: T[],
  ) => Promise<{ success: boolean; count?: number; error?: string }>;

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
        setResultSummary({
          success: result.count || 0,
          failed: parsedData.length - (result.count || 0),
          message: result.error,
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
      <DialogContent className="w-[calc(100vw-40px)] h-[calc(100vh-40px)] max-w-none max-h-none p-0 gap-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl bg-muted/5 flex flex-col fixed inset-5 translate-x-0 translate-y-0">
        <DialogHeader className="px-8 py-6 border-b bg-background shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
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
            <div className="flex flex-col items-center justify-center p-8 h-full gap-10 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 gap-12 w-full max-w-4xl items-center">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-2xl border-2 border-dashed border-transparent hover:border-emerald-100 hover:bg-emerald-50/30 transition-all duration-300">
                  <div className="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-3xl flex items-center justify-center mb-2 shadow-sm">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    1. Prepare your data
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Download the template and fill it with your data. Don't
                    remove the headers.
                  </p>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="mt-2"
                  >
                    <Download className="mr-2 h-4 w-4" /> Download Template
                  </Button>
                </div>

                {/* Divider mobile */}
                <div className="md:hidden h-px w-full bg-border" />

                {/* Divider desktop */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/20">
                  <ChevronRight className="w-12 h-12" />
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center text-center space-y-4 w-full">
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    2. Upload your file
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full aspect-4/3 max-h-[300px] border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group flex flex-col items-center justify-center shadow-inner"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="bg-background text-primary w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                      <CloudUpload className="h-10 w-10" />
                    </div>
                    <p className="text-lg font-semibold">
                      Click to upload spreadsheet
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      .xlsx or .csv files supported
                    </p>
                  </Button>
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
              <div className="px-8 py-4 flex items-center justify-between border-b bg-background/50 backdrop-blur-sm shrink-0 sticky top-0 z-20">
                <div className="flex gap-4">
                  <Badge
                    variant="outline"
                    className="px-3 py-1.5 text-sm gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                  >
                    <Check className="h-4 w-4" /> {validCount} Valid
                  </Badge>
                  {errorCount > 0 && (
                    <Badge
                      variant="outline"
                      className="px-3 py-1.5 text-sm gap-2 border-red-500/20 bg-red-500/10 text-red-500"
                    >
                      <AlertCircle className="h-4 w-4" /> {errorCount} Errors
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setStep("INSTRUCTIONS");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-6">
                <div className="border rounded-2xl bg-background shadow-sm h-full flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1">
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
                              <TableCell className="text-center font-mono text-xs text-muted-foreground w-[80px]">
                                {row.originalRowIndex + 2}
                              </TableCell>
                              {columns.map((col, cIdx) => (
                                <TableCell key={cIdx} className="py-3">
                                  {col.cell(row.data)}
                                </TableCell>
                              ))}

                              <TableCell className="w-[150px]">
                                {row.isValid ? (
                                  <div className="text-xs text-emerald-500 font-medium flex items-center gap-1.5 bg-emerald-500/10 w-fit px-2 py-1 rounded-full border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />{" "}
                                    Ready
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {row.errors.map((err, i) => {
                                      const isLimitError = err
                                        .toLowerCase()
                                        .includes("limit");
                                      return (
                                        <span
                                          key={i}
                                          className={cn(
                                            "text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-sm uppercase tracking-tight leading-none",
                                            isLimitError
                                              ? "text-amber-600 bg-amber-500/10 border-amber-500/30"
                                              : "text-red-600 bg-red-500/10 border-red-500/30",
                                          )}
                                        >
                                          <AlertCircle
                                            className={cn(
                                              "h-3 w-3 shrink-0",
                                              isLimitError
                                                ? "text-amber-600"
                                                : "text-red-600",
                                            )}
                                          />{" "}
                                          {err}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right w-[120px]">
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
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {step === "COMPLETION" && (
            <div
              ref={(el) => {
                if (el) {
                  import("party-js").then((party) => {
                    party.default.confetti(el, {
                      count: party.default.variation.range(40, 60),
                      spread: party.default.variation.range(40, 50),
                    });
                  });
                }
              }}
              className="flex flex-col items-center justify-center space-y-10 p-12 text-center h-full animate-in fade-in zoom-in-95 duration-500"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-100 blur-lg rounded-full opacity-50 animate-pulse" />
                <div className="h-32 w-32 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center relative shadow-sm border border-emerald-100">
                  <Check className="h-16 w-16" />
                </div>
              </div>

              <div className="space-y-1 max-w-md">
                <h3 className="text-3xl font-bold tracking-tight text-green-500">
                  Import Complete!
                </h3>
                <p className="text-muted-foreground text-lg">
                  Successfully imported{" "}
                  <span className="text-foreground font-semibold">
                    {resultSummary.success}
                  </span>{" "}
                  items.
                  {resultSummary.failed > 0 && (
                    <span className="block text-red-600 text-sm mt-2 font-medium">
                      {resultSummary.failed} items were skipped or failed.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <Button
                  onClick={() => setOpen(false)}
                  variant="outline"
                  size="lg"
                  className="min-w-[150px]"
                >
                  Close
                </Button>
                <Button
                  onClick={resetState}
                  size="lg"
                  className="min-w-[150px]"
                >
                  Upload More
                </Button>
              </div>
            </div>
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
          <DialogFooter className="px-8 py-6 border-t bg-background shrink-0 flex items-center justify-between sm:justify-between w-full">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {step === "VALIDATION" && (
              <Button
                onClick={handleCommit}
                disabled={validCount === 0 || isProcessing}
                className="pl-6 pr-8 h-10 text-base shadow-lg hover:shadow-xl transition-all"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                Import {validCount} Items
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
