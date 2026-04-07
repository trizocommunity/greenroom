"use client";

import {
  Crown,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  Link as LinkIcon,
  MoreVertical,
  QrCode,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { QrCodeWithActions } from "@/components/common/QrCodeWithActions";
import { StudentDetailsDialog } from "@/components/festival/pre-works/students/StudentDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_URL } from "@/config/routes";
import { generateBulkQrPdf, prepareStudentQrData } from "@/lib/qr-pdf-utils";
import {
  getQrCodeContent,
  getStudentProfilePath,
  getStudentProfileUrl,
} from "@/lib/student-profile-url";

type StudentForMyStudents = {
  id: string;
  name: string;
  chestNumber: string | null;
  isTeamLeader: boolean;
  category: { id: string; name: string } | null;
  group: { id: string; name: string; color: string } | null;
  profileSlug?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: any;
  age?: number | null;
  standard?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function MyStudentsClient({
  festivalId,
  festivalSlug,
  students,
}: {
  festivalId: string;
  festivalSlug: string;
  students: StudentForMyStudents[];
}) {
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of students) {
      if (!s.category) continue;
      map.set(s.category.id, { id: s.category.id, name: s.category.name });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [students]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [detailsStudent, setDetailsStudent] =
    useState<StudentForMyStudents | null>(null);
  const [qrStudent, setQrStudent] = useState<StudentForMyStudents | null>(null);
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);

  const visibleStudents = useMemo(() => {
    if (selectedCategoryId === "all") return students;
    return students.filter((s) => s.category?.id === selectedCategoryId);
  }, [students, selectedCategoryId]);

  // Handle bulk PDF download
  const handleBulkDownload = async () => {
    try {
      setIsDownloadingBulk(true);

      // Prepare QR data for all visible students
      const studentData = visibleStudents.map((s) => ({
        name: s.name,
        chestNumber: s.chestNumber || "N/A",
        groupName: s.group?.name,
        categoryName: s.category?.name,
        profileUrl: getStudentProfileUrl(
          APP_URL.replace(/\/$/, ""),
          festivalSlug,
          s,
        ),
      }));

      const qrData = await prepareStudentQrData(studentData);

      // Generate and download PDF
      await generateBulkQrPdf({
        festivalName: festivalSlug,
        students: qrData,
        fileName: `${festivalSlug}-team-qr-codes.pdf`,
      });

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Bulk download failed:", error);
      toast.error("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloadingBulk(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedCategoryId}
          onValueChange={setSelectedCategoryId}
        >
          <SelectTrigger className="h-10 w-full sm:w-[220px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bulk Download Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkDownload}
          disabled={isDownloadingBulk || visibleStudents.length === 0}
          className="shrink-0"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {isDownloadingBulk
            ? "Generating..."
            : `Download All (${visibleStudents.length})`}
        </Button>
      </div>

      {visibleStudents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No students found for this category.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleStudents.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{s.name}</span>
                    {s.isTeamLeader ? (
                      <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30">
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3.5 w-3.5" />
                          Team Leader
                        </span>
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.category?.name ?? "—"} · {s.chestNumber ?? "—"}
                  </div>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setDetailsStudent(s)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={getStudentProfilePath(festivalSlug, s)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setQrStudent(s)}>
                        <QrCode className="h-4 w-4 mr-2" />
                        View QR (Chest #)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          const profileUrl = getStudentProfileUrl(
                            APP_URL.replace(/\/$/, ""),
                            festivalSlug,
                            s,
                          );
                          navigator.clipboard.writeText(profileUrl);
                          toast.success("Profile link copied!");
                        }}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Copy Profile URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          const chestNumber =
                            s.chestNumber || getQrCodeContent(s);
                          const message = `Chest number: ${chestNumber}`;
                          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, "_blank");
                          toast.success("Opening WhatsApp...");
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Chest Number
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {detailsStudent ? (
        <StudentDetailsDialog
          festivalId={festivalId}
          student={detailsStudent}
          open={Boolean(detailsStudent)}
          onOpenChange={(open) => {
            if (!open) setDetailsStudent(null);
          }}
        />
      ) : null}

      <Dialog
        open={Boolean(qrStudent)}
        onOpenChange={(open) => !open && setQrStudent(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {qrStudent?.name ?? "Student"} - Chest Number QR
            </DialogTitle>
          </DialogHeader>
          {qrStudent ? (
            <div className="flex flex-col items-center gap-4 py-1">
              <QrCodeWithActions
                url={getQrCodeContent(qrStudent)}
                qrContent={getQrCodeContent(qrStudent)}
                size={200}
                fileName={`${qrStudent.name.replace(/\s+/g, "-").toLowerCase()}-chest-${qrStudent.chestNumber || "unknown"}.png`}
                shareMessage={`Chest number: ${qrStudent.chestNumber || getQrCodeContent(qrStudent)}`}
              />
              <div className="text-sm text-muted-foreground text-center">
                <p>This QR code contains the chest number</p>
                <p className="text-xs mt-1">
                  Used for programme reporting and attendance
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href={getStudentProfilePath(festivalSlug, qrStudent)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Profile
                </Link>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
