"use client";

import { useMembers } from "@/hooks/useMembers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";
import { format } from "date-fns";

interface MembersClientProps {
  festivalId: string;
}

export function MembersClient({ festivalId }: MembersClientProps) {
  const { members, isLoading } = useMembers(festivalId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Joined At</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member: any) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.user?.fullName || member.fullName || "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.user?.email || member.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <FestivalRoleBadge
                  festivalRole={member.role || "TEAM_LEADER"}
                />
              </TableCell>
              <TableCell>
                {member.group ? (
                  <Badge variant="outline">{member.group.name}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(member.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={member.isActive ? "default" : "secondary"}>
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <MemberActions member={member} />
              </TableCell>
            </TableRow>
          ))}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { revokeTeamLeader } from "@/server/actions/team.actions"; // Import action directly or use custom hook if available
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function MemberActions({ member }: { member: any }) {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const result = await revokeTeamLeader(member.id);
      if (result.success) {
        toast.success("Member removed");
        // In a real app, query invalidation should happen here.
        // Assuming useMembers hook handles it via revalidation or window reload?
        // Ideally useMutation from React Query if available.
        window.location.reload(); // Quick fix for revalidation if hook doesn't expose refetch
      } else {
        toast.error("Failed to remove member");
      }
    } catch (e) {
      toast.error("Error removing member");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>Details for {member.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <div className="font-medium">{member.fullName}</div>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <div className="font-medium">{member.email}</div>
            </div>
            {member.initialPassword && (
              <div className="grid gap-2">
                <Label>Initial Password</Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">
                    {member.initialPassword}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigator.clipboard.writeText(member.initialPassword)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this with the Team Leader.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        title="Remove Member"
        description="Are you sure you want to remove this member? Their account will not be deleted, but they will lose access to this festival."
        onDelete={handleRevoke}
        isDeleting={isRevoking}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}
