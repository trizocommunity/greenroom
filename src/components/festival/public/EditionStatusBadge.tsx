import { Badge } from "@/components/ui/badge";
import { EditionStatus } from "@prisma/client";
import { Radio, Archive, History } from "lucide-react";

interface EditionStatusBadgeProps {
  status: EditionStatus;
  isHistoricalView?: boolean;
}

export function EditionStatusBadge({
  status,
  isHistoricalView = false,
}: EditionStatusBadgeProps) {
  if (status === EditionStatus.ACTIVE && !isHistoricalView) {
    return (
      <Badge
        variant="default"
        className="bg-red-600 hover:bg-red-700 text-white gap-1.5 px-3 py-1 text-sm font-medium animate-pulse"
      >
        <Radio className="w-3.5 h-3.5" />
        LIVE EDITION
      </Badge>
    );
  }

  if (
    status === EditionStatus.FREEZE ||
    status === EditionStatus.ARCHIVED ||
    isHistoricalView
  ) {
    return (
      <Badge
        variant="secondary"
        className="bg-white/10 text-white/80 hover:bg-white/20 gap-1.5 px-3 py-1 text-sm font-medium"
      >
        <Archive className="w-3.5 h-3.5" />
        ARCHIVED EDITION
      </Badge>
    );
  }

  return null;
}
