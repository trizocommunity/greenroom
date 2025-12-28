import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useFestival } from "@/components/festival/FestivalContext";
import { CalendarClock } from "lucide-react";
import { format, isPast } from "date-fns";

interface DeadlinesCardProps {
  type: "participant" | "assignment";
}

export function DeadlinesCard({ type }: DeadlinesCardProps) {
  const festival = useFestival();

  const deadline =
    type === "participant"
      ? festival.participantCreationDeadline
      : festival.programmeAssignmentDeadline;

  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const isExpired = isPast(deadlineDate);

  return (
    <div className="mb-6">
      <Alert
        className={
          isExpired
            ? "border-destructive/50 bg-destructive/10"
            : "border-primary/20 bg-primary/5"
        }
      >
        <CalendarClock className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          {type === "participant"
            ? "Registration Deadline"
            : "Assignment Deadline"}
          {isExpired ? (
            <Badge variant="destructive" className="ml-2 text-xs">
              Closed
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="ml-2 text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20"
            >
              Active
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-1 text-xs">
          <span>
            {isExpired
              ? `The deadline for ${type === "participant" ? "adding participants" : "making assignments"} has passed.`
              : `You can ${type === "participant" ? "add participants" : "make assignments"} until this date.`}
          </span>
          <span className="font-semibold text-sm">
            {format(deadlineDate, "PPP p")}
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}
