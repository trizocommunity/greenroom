import { Clock, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusStripProps {
  festivalName: string;
  daysRemaining?: number | null;
  userRole: string;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function StatusStrip({
  festivalName,
  daysRemaining,
  userRole,
  orientation = "horizontal",
  className,
}: StatusStripProps) {
  return (
    <div
      className={cn(
        "flex gap-4 p-4 rounded-xl bg-card border shadow-xs",
        orientation === "vertical" ? "flex-col items-start" : "items-center",
        className,
      )}
    >
      <div className="flex-1 space-y-1">
        <h3 className="font-bold truncate" title={festivalName}>
          {festivalName}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="h-5 px-1.5 font-normal">
            <Shield className="mr-1 h-3 w-3" />
            {userRole}
          </Badge>
          {daysRemaining !== undefined && daysRemaining !== null && (
            <span
              className={cn(
                "flex items-center gap-1",
                daysRemaining < 10 && "text-destructive font-medium",
              )}
            >
              <Clock className="h-3 w-3" />
              {daysRemaining}d left
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
