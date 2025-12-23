import { differenceInDays } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditionCountdownBannerProps {
  endDate: Date | string;
  status: string; // or EditionStatus
  className?: string;
}

export function EditionCountdownBanner({
  endDate,
  status,
  className,
}: EditionCountdownBannerProps) {
  if (status !== "ACTIVE") return null;

  const end = new Date(endDate);
  const now = new Date();
  const daysLeft = differenceInDays(end, now);

  if (daysLeft > 10 || daysLeft < 0) return null;

  return (
    <div
      className={cn(
        "w-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-3 rounded-lg flex items-center gap-3",
        className,
      )}
    >
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div className="flex-1 text-sm font-medium">
        <span className="font-bold">Heads up!</span> This edition will freeze in{" "}
        {daysLeft === 0 ? "less than 24 hours" : `${daysLeft} days`}.
        <span className="block text-yellow-500/80 text-xs mt-0.5">
          All data will become read-only after that. Make your final edits now.
        </span>
      </div>
      <Clock className="w-5 h-5 opacity-50" />
    </div>
  );
}
