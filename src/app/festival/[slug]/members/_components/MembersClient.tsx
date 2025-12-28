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
                      {member.user.fullName ||
                        member.user.displayName ||
                        "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <FestivalRoleBadge festivalRole={member.role} />
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
            </TableRow>
          ))}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
