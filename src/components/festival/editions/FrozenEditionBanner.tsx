import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

interface FrozenEditionBannerProps {
  status: string; // or EditionStatus
  className?: string;
}

export function FrozenEditionBanner({
  status,
  className,
}: FrozenEditionBannerProps) {
  if (status !== "FREEZE" && status !== "ARCHIVED") return null;

  return (
    <div
      className={cn(
        "w-full bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3",
        className,
      )}
    >
      <Snowflake className="w-5 h-5 shrink-0 animate-pulse" />
      <div className="flex-1 text-sm font-medium">
        <span className="font-bold">This edition is frozen.</span>
        <span className="block text-blue-400/80 text-xs mt-0.5">
          All data is preserved in read-only mode. You cannot make any changes.
        </span>
      </div>
    </div>
  );
}
