"use client";

import * as XLSX from "xlsx";
import {
  AlertCircle,
  Check,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkCreateCategoriesAction } from "@/server/actions/category.actions";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface BulkUploadCategoriesModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

type UploadStep = "INSTRUCTIONS" | "UPLOAD" | "VALIDATION" | "COMPLETION";

const STEPS: { id: UploadStep; label: string }[] = [
  { id: "INSTRUCTIONS", label: "Prepare" },
  { id: "UPLOAD", label: "Upload" },
  { id: "VALIDATION", label: "Review" },
  { id: "COMPLETION", label: "Done" },
];

interface ParsedCategory {
  row: number;
  name: string;
  description: string;
  typeRaw: string;
  type: "SINGLE" | "GENERAL";
  isValid: boolean;
  errors: string[];
}

export function BulkUploadCategoriesModal({
  festivalId,
  trigger,
}: BulkUploadCategoriesModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("INSTRUCTIONS");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCategory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    success: number;
    failed: number;
  }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setStep("INSTRUCTIONS");
        setFile(null);
        setParsedData([]);
        setIsProcessing(false);
        setResultSummary({ success: 0, failed: 0 });
      }, 300);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ["Category Name", "Description", "Type (Single/General)"];
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      ["Music", "Vocal and Instrumental Events", "Single"],
      ["Off-Stage", "Writing and Drawing", "Single"],
      ["General", "Common events for everyone", "General"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categories");
    XLSX.writeFile(wb, "categories_template.xlsx");
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

        const rows = jsonData.slice(1) as any[][];

        const parsed: ParsedCategory[] = rows
          .map((row, index) => {
            const name = row[0]?.toString().trim() || "";
            const description = row[1]?.toString().trim() || "";
            const typeRaw = row[2]?.toString().trim() || "Single";

            const errors: string[] = [];
            if (!name) errors.push("Name is required");

            let type: "SINGLE" | "GENERAL" = "SINGLE";
            if (["GENERAL", "General", "general"].includes(typeRaw)) {
              type = "GENERAL";
            } else if (!["SINGLE", "Single", "single", ""].includes(typeRaw)) {
              errors.push(`Invalid Type: ${typeRaw}`);
            }

            return {
              row: index + 2,
              name,
              description,
              typeRaw,
              type,
              isValid: errors.length === 0,
              errors,
            };
          })
          .filter((p) => p.name);

        setParsedData(parsed);
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

  const handleBulkCreate = async () => {
    setIsProcessing(true);
    const validCategories = parsedData.filter((p) => p.isValid);

    try {
      const categoriesToCreate = validCategories.map((p) => ({
        name: p.name,
        description: p.description,
        type: p.type,
      }));

      const result = await bulkCreateCategoriesAction(
        festivalId,
        categoriesToCreate,
      );

      if (result.success) {
        setResultSummary({
          success: result.count || 0,
          failed: parsedData.length - (result.count || 0),
        });

        queryClient.invalidateQueries({ queryKey: ["categories", festivalId] });
        router.refresh();
        setStep("COMPLETION");
      } else {
        toast.error(result.error || "Batch upload failed");
      }
    } catch (e) {
      console.error("Bulk upload failed", e);
      toast.error("Bulk upload failed unexpected.");
    }
    setIsProcessing(false);
  };

  const validCount = parsedData.filter((p) => p.isValid).length;
  const errorCount = parsedData.filter((p) => !p.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl bg-muted/5">
        <DialogHeader className="p-8 pb-6 border-b bg-background shrink-0">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold">
              Bulk Upload Categories
            </DialogTitle>
            <div className="flex gap-2">
              {STEPS.map((s, idx) => {
                const isCurrent = step === s.id;
                const isPast = STEPS.findIndex((x) => x.id === step) > idx;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center px-3 py-1 rounded-full text-xs font-semibold max-sm:hidden",
                      isCurrent
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : isPast
                          ? "bg-muted text-muted-foreground opacity-50"
                          : "opacity-30",
                    )}
                  >
                    <span className="mr-2">{idx + 1}</span> {s.label}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col bg-background min-h-0">
          {(step === "INSTRUCTIONS" || step === "UPLOAD") && (
            <div className="flex flex-col md:flex-row items-center justify-center p-8 overflow-y-auto gap-10">
              <div className="text-center space-y-4 max-w-sm">
                <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">1. Get the Template</h3>
                <p className="text-muted-foreground text-sm">
                  Download our Excel template.
                </p>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="w-full border-dashed border-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" /> Download .xlsx Template
                </Button>
              </div>

              <div className="hidden w-16 h-px bg-border md:block" />

              <div className="text-center space-y-4 max-w-sm w-full">
                <h3 className="text-lg font-semibold">2. Upload Filled File</h3>
                <button
                  type="button"
                  className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-8 hover:bg-muted/30 transition-all cursor-pointer group flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      fileInputRef.current?.click();
                  }}
                >
                  <div className="bg-primary/5 text-primary w-14 h-14 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CloudUpload className="h-7 w-7" />
                  </div>
                  <p className="font-medium">Click to upload spreadsheet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    .xlsx or .csv files supported
                  </p>
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
          )}

          {step === "VALIDATION" && (
            <div className="flex flex-col h-full bg-muted/5 min-h-0">
              <div className="px-6 py-4 flex items-center justify-between border-b bg-background shrink-0">
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-medium">
                    <Check className="h-3.5 w-3.5" /> {validCount} Valid
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> {errorCount}{" "}
                      Errors
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setStep("INSTRUCTIONS");
                  }}
                >
                  Upload Different File
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <div className="border rounded-xl bg-background overflow-hidden h-full shadow-sm flex flex-col">
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="w-[60px] text-center">
                            Row
                          </TableHead>
                          <TableHead>Category Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...parsedData]
                          .sort((a, b) =>
                            a.isValid === b.isValid ? 0 : a.isValid ? -1 : 1,
                          )
                          .map((row) => (
                            <TableRow
                              key={row.row}
                              className={
                                !row.isValid
                                  ? "bg-red-50/10 hover:bg-red-50/15"
                                  : ""
                              }
                            >
                              <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                {row.row}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm">
                                    {row.name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {row.description}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{row.type}</Badge>
                              </TableCell>
                              <TableCell>
                                {row.isValid ? (
                                  <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />{" "}
                                    Ready
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    {row.errors.map((err, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] text-red-600 font-medium flex items-center gap-1"
                                      >
                                        <X className="h-3 w-3" /> {err}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "COMPLETION" && (
            <div className="flex flex-col items-center justify-center space-y-6 p-12 text-center h-full animate-in fade-in zoom-in duration-300 overflow-y-auto">
              <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Check className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold tracking-tight">
                  Import Complete
                </h3>
                <p className="text-muted-foreground text-lg">
                  Processed {resultSummary.success} records successfully.
                </p>
              </div>
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  onClick={() => setOpen(false)}
                  variant="outline"
                  className="min-w-[150px]"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setStep("INSTRUCTIONS");
                    setFile(null);
                    setParsedData([]);
                    setIsProcessing(false);
                    setResultSummary({ success: 0, failed: 0 });
                  }}
                  className="min-w-[150px]"
                >
                  Upload More
                </Button>
              </div>
            </div>
          )}
        </div>

        {step !== "COMPLETION" && (
          <DialogFooter className="p-6 border-t bg-background shrink-0">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {step === "VALIDATION" && (
              <Button
                onClick={handleBulkCreate}
                disabled={validCount === 0 || isProcessing}
                className="pl-4 pr-6"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                Import {validCount} Categories
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
