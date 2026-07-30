"use client";

import {
  Crown,
  ExternalLink,
  Eye,
  Link as LinkIcon,
  MoreVertical,
  Plus,
  QrCode,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { QrCodeWithActions } from "@/components/common/QrCodeWithActions";
import { DeadlinesCard } from "@/components/festival/pre-event-works/DeadlinesCard";
import { ParticipantDetailsDialog } from "@/components/festival/pre-event-works/participants/ParticipantDetailsDialog";
import { AddParticipantDialog } from "@/components/participant/team-leader/AddParticipantDialog";
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
import { useDeadlineLock } from "@/features/festivals/hooks/use-deadline-lock";
import {
  getParticipantProfilePath,
  getParticipantProfileUrl,
  getQrCodeContent,
} from "@/features/participants/services/participant-profile-url";

type ParticipantForMyParticipants = {
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
  dateOfBirth?: string | null;
  standard?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function MyParticipantsClient({
  festivalId,
  festivalSlug,
  participants,
  allCategories = [],
  deadline,
  isReadOnly,
}: {
  festivalId: string;
  festivalSlug: string;
  participants: ParticipantForMyParticipants[];
  allCategories?: { id: string; name: string }[];
  deadline?: string | Date | null;
  isReadOnly?: boolean;
}) {
  const router = useRouter();
  const { isLocked } = useDeadlineLock(deadline ?? null);
  const runtimeIsReadOnly = Boolean(isReadOnly) || isLocked;

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of participants) {
      if (!s.category) continue;
      map.set(s.category.id, { id: s.category.id, name: s.category.name });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [participants]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [detailsParticipant, setDetailsParticipant] =
    useState<ParticipantForMyParticipants | null>(null);
  const [qrParticipant, setQrParticipant] =
    useState<ParticipantForMyParticipants | null>(null);

  const visibleParticipants = useMemo(() => {
    if (selectedCategoryId === "all") return participants;
    return participants.filter((s) => s.category?.id === selectedCategoryId);
  }, [participants, selectedCategoryId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">My Participants</h1>
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger className="h-9 w-full sm:w-[200px]">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <DeadlinesCard
            label="Participants"
            deadline={deadline}
            isLockedOverride={runtimeIsReadOnly}
          />
          <AddParticipantDialog
            festivalId={festivalId}
            categories={allCategories}
            disabled={runtimeIsReadOnly}
            onCreated={() => router.refresh()}
            trigger={
              <Button
                size="sm"
                disabled={runtimeIsReadOnly}
                className="w-full sm:w-auto h-9"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
            }
          />
        </div>
      </div>

      {visibleParticipants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No participants found for this category.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleParticipants.map((s) => (
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
                      <DropdownMenuItem
                        onSelect={() => setDetailsParticipant(s)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setQrParticipant(s)}>
                        <QrCode className="h-4 w-4 mr-2" />
                        View QR (Chest #)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {detailsParticipant ? (
        <ParticipantDetailsDialog
          festivalId={festivalId}
          participant={detailsParticipant}
          open={Boolean(detailsParticipant)}
          onOpenChange={(open) => {
            if (!open) setDetailsParticipant(null);
          }}
        />
      ) : null}

      <Dialog
        open={Boolean(qrParticipant)}
        onOpenChange={(open) => !open && setQrParticipant(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {qrParticipant?.name ?? "Participant"} - Chest Number QR
            </DialogTitle>
          </DialogHeader>
          {qrParticipant ? (
            <div className="flex flex-col items-center gap-4 py-1">
              <QrCodeWithActions
                url={getQrCodeContent(qrParticipant)}
                qrContent={getQrCodeContent(qrParticipant)}
                size={200}
                fileName={`${qrParticipant.name.replace(/\s+/g, "-").toLowerCase()}-chest-${qrParticipant.chestNumber || "unknown"}.png`}
                shareMessage={`Chest number: ${qrParticipant.chestNumber || getQrCodeContent(qrParticipant)}`}
              />
              <div className="text-sm text-muted-foreground text-center">
                <p>This QR code contains the chest number</p>
                <p className="text-xs mt-1">
                  Used for programme reporting and attendance
                </p>
              </div>
              <Button asChild className="w-full">
                <Link
                  href={getParticipantProfilePath(festivalSlug, qrParticipant)}
                >
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
