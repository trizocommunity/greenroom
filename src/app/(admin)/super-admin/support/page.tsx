import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { getAllTicketsAction } from "@/server/actions/support.actions";
import { format } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const tickets = await getAllTicketsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Manage all support requests from users.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-lg font-medium">No tickets found</p>
              <p className="text-sm text-muted-foreground">
                There are no support tickets to manage right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    {ticket.festival ? (
                      <Badge
                        variant="outline"
                        className="bg-primary/5 text-primary border-primary/20 text-[10px] px-2 py-0 h-5"
                      >
                        {ticket.festival.name}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-[10px] px-2 py-0 h-5"
                      >
                        General
                      </Badge>
                    )}
                    <Badge
                      variant={
                        ticket.status === "RESOLVED"
                          ? "default"
                          : ticket.status === "OPEN"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px] px-1.5 py-0 h-5 uppercase"
                    >
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(ticket.updatedAt), "MMM d")}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Sent by:</span>
                    <span className="text-xs font-semibold text-foreground">
                      {ticket.user.fullName || ticket.user.email || "User"}
                    </span>
                    {"senderRole" in ticket && ticket.senderRole && (
                      <FestivalRoleBadge
                        festivalRole={ticket.senderRole as string}
                        className="text-[10px] px-1.5 py-0 h-5"
                      />
                    )}
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {ticket.category.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                    {ticket.messages[0]?.message}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Badge
                    variant={
                      ticket.priority === "HIGH"
                        ? "destructive"
                        : ticket.priority === "MEDIUM"
                          ? "outline"
                          : "secondary"
                    }
                    className="text-[10px] px-1.5 h-5 border-transparent bg-muted/50 text-muted-foreground"
                  >
                    {ticket.priority}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 hover:bg-primary/10 hover:text-primary ml-auto"
                    asChild
                  >
                    <Link href={`/super-admin/support/${ticket.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
