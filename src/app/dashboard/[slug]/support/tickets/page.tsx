import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { getUserTicketsAction } from "@/server/actions/support.actions";
import { format } from "date-fns";
import { Plus, Ticket } from "lucide-react";
import Link from "next/link";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tickets = await getUserTicketsAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            View and manage your support requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={`/dashboard/${slug}/support/tickets/create`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Ticket
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tickets found</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create a new ticket to get started.
              </p>
              <Button asChild>
                <Link href={`/dashboard/${slug}/support/tickets/create`}>
                  Create Ticket
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <Badge
                    variant={
                      ticket.status === "RESOLVED"
                        ? "default"
                        : ticket.status === "OPEN"
                          ? "secondary" // or a custom simple blue if secondary is gray
                          : "outline"
                    }
                    className="mb-2"
                  >
                    {ticket.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(ticket.updatedAt), "MMM d")}
                  </span>
                </div>
                <CardTitle className="text-base line-clamp-1">
                  {ticket.subject}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-10">
                  {ticket.messages[0]?.message}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {"senderRole" in ticket && ticket.senderRole && (
                    <FestivalRoleBadge
                      festivalRole={ticket.senderRole as string}
                      className="text-xs"
                    />
                  )}
                  <Badge variant="outline" className="text-xs font-normal">
                    {ticket.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-normal">
                    {ticket.priority} Priority
                  </Badge>
                </div>
              </CardContent>
              <div className="p-4 pt-0 mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href={`/dashboard/${slug}/support/tickets/${ticket.id}`}
                  >
                    View Details
                  </Link>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
