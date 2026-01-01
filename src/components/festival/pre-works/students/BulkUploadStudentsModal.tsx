"use client";

import * as XLSX from "xlsx";
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  CloudUpload,
  ArrowRight,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import {
  bulkCreateStudentsAction,
  validateStudentsAction,
} from "@/server/actions/student.actions";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface BulkUploadStudentsModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

type UploadStep = "INSTRUCTIONS" | "UPLOAD" | "VALIDATION" | "COMPLETION";

const STEPS: { id: UploadStep; label: string }[] = [
  { id: "INSTRUCTIONS", label: "Prepare" },
  { id: "UPLOAD", label: "Upload" }, // Merging instructions & upload visually mostly, but keeping logic
  { id: "VALIDATION", label: "Review" },
  { id: "COMPLETION", label: "Done" },
];

interface ParsedStudent {
  row: number;
  name: string;
  groupName: string;
  categoryName: string;
  gender: string; // MALE, FEMALE, OTHER
  email?: string;
  phone?: string;
  isValid: boolean;
  errors: string[];
  groupId?: string;
  categoryId?: string;
}

export function BulkUploadStudentsModal({
  festivalId,
  trigger,
}: BulkUploadStudentsModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("INSTRUCTIONS");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    success: number;
    failed: number;
  }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { groups } = useGroups(festivalId);
  const { categories } = useCategories(festivalId);

  // Refresh hooks
  const queryClient = useQueryClient();
  const router = useRouter();

  // Reset state on open/close
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
    const headers = ["Name", "Group", "Category", "Gender", "Email", "Phone"];
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      [
        "John Doe",
        "Group A",
        "Solo Singing",
        "Male",
        "john@example.com",
        "9876543210",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    // Add Reference Sheet
    const referenceData = [
      ["Valid Groups", "Valid Categories"],
      ...Array.from({ length: Math.max(groups.length, categories.length) }).map(
        (_, i) => [groups[i]?.name || "", categories[i]?.name || ""],
      ),
    ];
    const refWs = XLSX.utils.aoa_to_sheet(referenceData);
    XLSX.utils.book_append_sheet(wb, refWs, "Reference");

    XLSX.writeFile(wb, "students_template.xlsx");
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

        // Skip header row
        const rows = jsonData.slice(1) as any[][];

        // 1. Initial Parse & Client-Side Validation
        const parsed: ParsedStudent[] = rows
          .map((row, index) => {
            // Mapping based on assumed index: Name(0), Group(1), Category(2), Gender(3), Email(4), Phone(5)
            const name = row[0]?.toString().trim() || "";
            const groupName = row[1]?.toString().trim() || "";
            const categoryName = row[2]?.toString().trim() || "";
            const genderRaw = row[3]?.toString().trim().toUpperCase() || "";
            const email = row[4]?.toString().trim() || "";
            const phone = row[5]?.toString().trim() || "";

            // Validation Logic
            const errors: string[] = [];
            if (!name) errors.push("Name is required");

            // Loose match for group
            const group = groups.find(
              (g: any) => g.name.toLowerCase() === groupName.toLowerCase(),
            );
            if (!groupName) {
              errors.push("Group is required");
            } else if (!group) {
              errors.push(`Group '${groupName}' not found`);
            }

            // Loose match for category
            const category = categories.find(
              (c: any) => c.name.toLowerCase() === categoryName.toLowerCase(),
            );
            if (!categoryName) {
              errors.push("Category is required");
            } else if (!category) {
              errors.push(`Category '${categoryName}' not found`);
            }

            let gender = "MALE";
            if (!genderRaw) {
              gender = "MALE"; // Default if missing
            } else if (["MALE", "M"].includes(genderRaw)) {
              gender = "MALE";
            } else if (["FEMALE", "F"].includes(genderRaw)) {
              gender = "FEMALE";
            } else if (["OTHER", "O"].includes(genderRaw)) {
              gender = "OTHER";
            } else {
              errors.push("Invalid Gender");
            }

            return {
              row: index + 2, // +1 for 0-index, +1 for header
              name,
              groupName,
              categoryName,
              gender,
              email,
              phone,
              isValid: errors.length === 0,
              errors,
              // Store IDs for submission
              groupId: group?.id,
              categoryId: category?.id,
            };
          })
          .filter((p) => p.name || p.groupName); // Filter empty rows

        // 2. Server-Side Duplicate Check
        // Prepare candidates list (only those valid so far or at least having a name)
        const candidatesToCheck = parsed
          .filter((p) => p.name)
          .map((p) => ({ name: p.name, email: p.email }));

        if (candidatesToCheck.length > 0) {
          const conflicts = await validateStudentsAction(
            festivalId,
            candidatesToCheck,
          );

          // Apply conflicts to parsed data
          parsed.forEach((p) => {
            const nameKey = `name:${p.name.toLowerCase()}`;
            const emailKey = p.email ? `email:${p.email.toLowerCase()}` : "";

            if (conflicts[nameKey]) {
              p.errors.push(conflicts[nameKey]);
              p.isValid = false;
            } else if (emailKey && conflicts[emailKey]) {
              p.errors.push(conflicts[emailKey]);
              p.isValid = false;
            }
          });
        }

        setParsedData(parsed);
        setStep("VALIDATION");
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse file. Ensure it's a valid Excel/CSV.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleBulkCreate = async () => {
    setIsProcessing(true);
    const validStudents = parsedData.filter((p) => p.isValid);

    try {
      // Map to server action expected format
      const studentsToCreate = validStudents.map((s) => ({
        name: s.name,
        groupId: s.groupId!, // We know it exists if valid
        categoryId: s.categoryId!,
        gender: s.gender,
        email: s.email,
        phone: s.phone,
      }));

      const result = await bulkCreateStudentsAction(
        festivalId,
        studentsToCreate,
      );

      setResultSummary({
        success: result.successCount,
        failed: result.errors.length,
      });

      if (result.errors.length > 0) {
        console.error("Bulk upload errors:", result.errors);
      }

      // Refresh Data
      queryClient.invalidateQueries({ queryKey: ["students", festivalId] });
      router.refresh(); // Fallback for Server Components
    } catch (e) {
      console.error("Bulk upload failed", e);
      toast.error("Bulk upload failed unexpected.");
    }

    setIsProcessing(false);
    setStep("COMPLETION");
  };

  const validCount = parsedData.filter((p) => p.isValid).length;
  const errorCount = parsedData.filter((p) => !p.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full md:w-fit" variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl bg-muted/5">
        <DialogHeader className="p-8 pb-6 border-b bg-background flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold">
              Bulk Upload Students
            </DialogTitle>
            <div className="flex gap-2">
              {/* Visual Stepper */}
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
          <DialogDescription className="hidden">
            Add multiple students at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1  flex flex-col bg-background min-h-0">
          {(step === "INSTRUCTIONS" || step === "UPLOAD") && (
            <div className="flex flex-col md:flex-row  items-center justify-center p-8 overflow-y-auto gap-10">
              {/* Step 1: Template */}
              <div className="text-center space-y-4 max-w-sm">
                <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">1. Get the Template</h3>
                <p className="text-muted-foreground text-sm">
                  Download our smart Excel template with valid Groups and
                  Categories pre-listed.
                </p>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="w-full border-dashed border-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" /> Download .xlsx Template
                </Button>
              </div>

              <div className="hidden w-16 h-px bg-border" />

              {/* Step 2: Upload */}
              <div className="text-center space-y-4 max-w-sm w-full">
                <h3 className="text-lg font-semibold">2. Upload Filled File</h3>
                <div
                  className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-8 hover:bg-muted/30 transition-all cursor-pointer group flex flex-col items-center justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-primary/5 text-primary w-14 h-14 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CloudUpload className="h-7 w-7" />
                  </div>
                  <p className="font-medium">Click to upload spreadsheet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    .xlsx or .csv files supported
                  </p>
                </div>
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
            <div className="flex flex-col h-full bg-muted/5 min-h-0 ">
              <div className="px-6 py-4 flex items-center justify-between border-b bg-background flex-shrink-0">
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
                          <TableHead>Student Name</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...parsedData]
                          .sort((a, b) => {
                            // Sort: valid first
                            if (a.isValid === b.isValid) return 0;
                            return a.isValid ? -1 : 1;
                          })
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
                                    {row.email}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                      {row.groupName}
                                    </span>
                                    <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100">
                                      {row.categoryName}
                                    </span>
                                  </div>
                                  <span className="text-muted-foreground px-1">
                                    {row.gender}
                                  </span>
                                </div>
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
                  Processed {resultSummary.success + resultSummary.failed}{" "}
                  records.
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-100 font-medium">
                    {resultSummary.success} Successful
                  </div>
                  {resultSummary.failed > 0 && (
                    <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 font-medium">
                      {resultSummary.failed} Failed
                    </div>
                  )}
                </div>
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
          <DialogFooter className="p-6 border-t bg-background flex-shrink-0">
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
                Import {validCount} Students
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
