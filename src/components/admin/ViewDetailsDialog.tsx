"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, KeyRound } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetUserPassword } from "@/server/actions/admin-user.actions";
import { toast } from "sonner";

interface ViewDetailsDialogProps {
  title: string;
  description?: string;
  data: Record<string, any>;
  type?: "default" | "audit";
}

export function ViewDetailsDialog({
  title,
  description,
  data,
  type: _type = "default",
}: ViewDetailsDialogProps) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword) return;

    setIsResetting(true);
    try {
      // data.id is assumed to be the user ID based on usage in users/page.tsx
      // If data might not have 'id', we should check, but 'users' list usually has it.
      const result = await resetUserPassword(data.id, newPassword);
      if (result.success) {
        toast.success("Password reset successfully");
        setIsResetDialogOpen(false);
        setNewPassword("");
      } else {
        toast.error("Failed to reset password");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View Details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-6 py-4">
            {Object.entries(data).map(([key, value]) => {
              if (value === null || value === undefined) return null;

              // Hide sensible fields regarding password
              if (key === "password" || key === "passwordHash") return null;

              if (
                key === "metadata" ||
                key === "branding" ||
                (typeof value === "object" &&
                  value !== null &&
                  !Array.isArray(value) &&
                  !(value instanceof Date))
              ) {
                // JSON / Object handling
                return (
                  <div key={key} className="space-y-2">
                    <h4 className="text-sm font-medium leading-none capitalize tracking-tight text-muted-foreground">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </h4>
                    <div className="rounded-md border bg-muted/50 p-3 font-mono text-xs overflow-auto max-h-60">
                      <pre>{JSON.stringify(value, null, 2)}</pre>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="grid grid-cols-3 gap-4 items-start pb-4 border-b last:border-0 last:pb-0"
                >
                  <h4 className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </h4>
                  <div className="col-span-2 text-sm font-medium wrap-break-word">
                    {formatValue(key, value)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {/* Reset Password Action - Only show if data looks like a User (has email/role) */}
        {(data.email || data.globalRole) && (
          <div className="pt-4 border-t mt-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-destructive hover:text-destructive"
              onClick={() => setIsResetDialogOpen(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Nested Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this user. You will be able to copy it
              now. It will be hashed immediately after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || isResetting}
            >
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function formatValue(key: string, value: any): React.ReactNode {
  if (
    value instanceof Date ||
    (typeof value === "string" &&
      !Number.isNaN(Date.parse(value)) &&
      key.toLowerCase().includes("date")) ||
    key.toLowerCase().includes("at")
  ) {
    try {
      return format(new Date(value), "MMM d, yyyy HH:mm:ss");
    } catch (e) {
      return String(value);
    }
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (key === "currency") {
    return <span className="font-mono">{String(value).toUpperCase()}</span>;
  }

  return String(value);
}
