import { Crown } from "lucide-react";
import { cn } from "@/core/utils/cn";

export interface ParticipantNameBlockProps {
  primaryName: string;
  isGroup?: boolean;
  subtitle?: string | null;
  teamMemberNames?: string[];
  /** Primary text dimming for un-reported rows */
  isMuted?: boolean;
  /** Optional wrapper class */
  className?: string;
}

/**
 * Unified component for displaying a participant or team name block.
 * Handles the crown icon for groups, subtitle, and team members list.
 */
export function ParticipantNameBlock({
  primaryName,
  isGroup,
  subtitle,
  teamMemberNames,
  isMuted,
  className,
}: ParticipantNameBlockProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "flex items-center gap-1 font-medium truncate",
          isMuted ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {isGroup ? <Crown className="h-3 w-3 shrink-0 text-primary" /> : null}
        <span className="truncate">{primaryName}</span>
      </p>
      
      {subtitle && (
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5 tracking-wide">
          {subtitle}
        </p>
      )}
      
      {isGroup && teamMemberNames && teamMemberNames.length > 0 ? (
        <div className="mt-1 space-y-0.5">
          {teamMemberNames.map((name, i) => (
            <p key={i} className="truncate text-[10px] sm:text-[11px] text-muted-foreground/80 pl-4">
              {name}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
