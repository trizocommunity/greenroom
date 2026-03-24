"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown, ExternalLink, Eye, MoreVertical, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentDetailsDialog } from "@/components/festival/pre-works/students/StudentDetailsDialog";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
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
import { APP_URL } from "@/config/routes";
import { getStudentProfileUrl } from "@/lib/student-profile-url";

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
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [detailsStudent, setDetailsStudent] = useState<StudentForMyStudents | null>(null);
  const [qrStudent, setQrStudent] = useState<StudentForMyStudents | null>(null);

  const visibleStudents = useMemo(() => {
    if (selectedCategoryId === "all") return students;
    return students.filter((s) => s.category?.id === selectedCategoryId);
  }, [students, selectedCategoryId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
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
                        <Link href={`/${festivalSlug}/${s.profileSlug ?? s.id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setQrStudent(s)}>
                        <QrCode className="h-4 w-4 mr-2" />
                        View QR
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

      <Dialog open={Boolean(qrStudent)} onOpenChange={(open) => !open && setQrStudent(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{qrStudent?.name ?? "Student"} - QR Code</DialogTitle>
          </DialogHeader>
          {qrStudent ? (
            <div className="flex flex-col items-center gap-4 py-1">
              <div className="rounded-lg border bg-white p-4">
                <QrCodeDisplay
                  url={getStudentProfileUrl(APP_URL.replace(/\/$/, ""), festivalSlug, qrStudent)}
                  size={200}
                />
              </div>
              <Button asChild className="w-full">
                <Link href={`/${festivalSlug}/${qrStudent.profileSlug ?? qrStudent.id}`}>
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

