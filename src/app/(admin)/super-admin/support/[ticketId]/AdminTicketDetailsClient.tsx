"use client";

import { format } from "date-fns";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getTicketDetailsAction,
  sendMessageAction,
  updateTicketStatusAction,
} from "@/server/actions/support.actions";

interface Message {
  id: string;
  message: string;
  senderType: string;
  createdAt: Date;
  senderId: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  user: {
    fullName: string | null;
    email: string;
  };
  festival?: {
    name: string;
    slug: string;
  } | null;
  senderRole?: string | null;
}

export default function AdminTicketDetailsClient({
  ticketId,
}: {
  ticketId: string;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const data = await getTicketDetailsAction(ticketId);
      setTicket(data);
    } catch (error) {
      toast.error("Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 10000); // Polling
    return () => clearInterval(interval);
  }, [fetchTicket]);

  useEffect(() => {
    const messageCount = ticket?.messages?.length || 0;
    if (scrollRef.current && messageCount > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket]); // Biome suggests ticket is enough or redundant if length is used inside

  const handleSendMessage = async () => {
    if (!replyMessage.trim()) return;

    setIsSending(true);
    try {
      const result = await sendMessageAction(ticketId, replyMessage);
      if (result.success) {
        setReplyMessage("");
        fetchTicket();
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const result = await updateTicketStatusAction(ticketId, newStatus as any);
      if (result.success) {
        toast.success("Status updated");
        fetchTicket();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-bold">Ticket not found</h2>
        <Button asChild className="mt-4">
          <Link href="/super-admin/support">Back to Support</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/super-admin/support">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {ticket.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>
                Sent by:{" "}
                <span className="font-medium text-foreground">
                  {ticket.user.fullName || ticket.user.email}
                </span>
              </span>
              {ticket.senderRole && (
                <FestivalRoleBadge
                  festivalRole={ticket.senderRole}
                  className="text-xs"
                />
              )}
              {ticket.festival && (
                <>
                  <span>•</span>
                  <span className="font-medium text-primary">
                    {ticket.festival.name}
                  </span>
                </>
              )}
              <span>•</span>
              <Badge variant="outline">#{ticket.id.slice(0, 8)}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-none bg-muted/5">
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <ScrollArea className="h-full px-4 py-4" ref={scrollRef}>
              <div className="space-y-3 pb-4">
                {ticket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderType === "ADMIN"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-2 max-w-[85%] ${
                        msg.senderType === "ADMIN"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarFallback
                          className={`text-[10px] ${
                            msg.senderType === "ADMIN"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.senderType === "ADMIN" ? "Me" : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`group relative rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          msg.senderType === "ADMIN"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-background border border-border rounded-tl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                        <span
                          className={`text-[9px] opacity-70 mt-1 block text-right font-medium ${msg.senderType === "ADMIN" ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                        >
                          {format(new Date(msg.createdAt), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <div className="p-3 bg-background border-t">
            <div className="flex w-full gap-2 items-end">
              <Textarea
                placeholder="Type your reply..."
                className="min-h-[44px] max-h-[120px] resize-none py-3 px-4 rounded-xl border-muted-foreground/20 focus-visible:ring-1"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-[44px] w-[44px] rounded-xl shrink-0"
                onClick={handleSendMessage}
                disabled={isSending || !replyMessage.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Sidebar Controls */}
        <div className="w-full md:w-72 space-y-4 shrink-0">
          <Card className="shadow-sm border-none bg-muted/5 h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">
                  Status
                </span>
                <Select
                  disabled={isUpdatingStatus}
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground block">
                    Priority
                  </span>
                  <Badge
                    variant={
                      ticket.priority === "HIGH"
                        ? "destructive"
                        : ticket.priority === "MEDIUM"
                          ? "default"
                          : "secondary"
                    }
                    className="text-[10px] px-2 h-6 w-fit"
                  >
                    {ticket.priority}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground block">
                    Category
                  </span>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {ticket.category.toLowerCase()}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Created
                  </span>
                  <p className="text-xs text-foreground font-medium">
                    {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(ticket.createdAt), "h:mm a")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
