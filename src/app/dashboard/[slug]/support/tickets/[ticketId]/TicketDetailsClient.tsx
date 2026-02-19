"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  getTicketDetailsAction,
  sendMessageAction,
} from "@/server/actions/support.actions";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  status: string;
  priority: string;
  category: string;
  createdAt: Date;
  messages: Message[];
  user: {
    fullName: string | null;
    email: string;
  };
}

export default function TicketDetailsClient({
  slug,
  ticketId,
}: {
  slug: string;
  ticketId: string;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch ticket details
  const fetchTicket = useCallback(async () => {
    try {
      const data = await getTicketDetailsAction(ticketId);
      // @ts-ignore - Date serialization issue from server action
      setTicket(data);
    } catch (error) {
      toast.error("Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    // Simple polling every 10 seconds
    const interval = setInterval(fetchTicket, 10000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  useEffect(() => {
    if (scrollRef.current && ticket?.messages) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket]);

  const handleSendMessage = async () => {
    if (!replyMessage.trim()) return;

    setIsSending(true);
    try {
      const result = await sendMessageAction(ticketId, replyMessage);
      if (result.success) {
        setReplyMessage("");
        fetchTicket(); // Refresh immediately
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSending(false);
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
          <Link href={`/dashboard/${slug}/support/tickets`}>
            Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/${slug}/support/tickets`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {ticket.subject}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant="outline">#{ticket.id.slice(0, 8)}</Badge>
              <span>•</span>
              <span>{ticket.category}</span>
              <span>•</span>
              <Badge
                variant={
                  ticket.status === "RESOLVED"
                    ? "default"
                    : ticket.status === "OPEN"
                      ? "secondary"
                      : "outline"
                }
              >
                {ticket.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden shadow-md">
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="space-y-4">
                {ticket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderType === "USER"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        msg.senderType === "USER"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback
                          className={
                            msg.senderType === "USER"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }
                        >
                          {msg.senderType === "USER" ? "ME" : "SP"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`group relative rounded-lg px-4 py-2 text-sm shadow-sm ${
                          msg.senderType === "USER"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 border border-border"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <span className="text-[10px] opacity-70 mt-1 block text-right">
                          {format(new Date(msg.createdAt), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-4 bg-muted/20 border-t">
            {ticket.status === "CLOSED" ? (
              <div className="w-full text-center text-muted-foreground p-4 bg-muted/50 rounded-lg">
                This ticket is closed. Please create a new ticket for further
                assistance.
              </div>
            ) : (
              <div className="flex w-full gap-2 items-end">
                <Textarea
                  placeholder="Type your message..."
                  className="min-h-[60px] resize-none"
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
                  className="h-[60px] w-[60px]"
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
            )}
          </CardFooter>
        </Card>

        {/* Sidebar Info (Desktop) */}
        <div className="w-full md:w-80 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Created
                </span>
                <p className="text-sm">
                  {format(new Date(ticket.createdAt), "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Priority
                </span>
                <div className="mt-1">
                  <Badge
                    variant={
                      ticket.priority === "HIGH"
                        ? "destructive"
                        : ticket.priority === "MEDIUM"
                          ? "default" // or warning?
                          : "secondary"
                    }
                  >
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Status
                </span>
                <p className="text-sm font-medium mt-1">{ticket.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
