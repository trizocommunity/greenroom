import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroups } from "@/hooks/useGroups";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

interface TeamLeaderDialogProps {
  festivalId: string;
  groupId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function TeamLeaderDialog({
  festivalId,
  groupId,
  trigger,
  onSuccess,
}: TeamLeaderDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { assignTeamLeader, isAssigningTeamLeader } = useGroups(festivalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await assignTeamLeader({ groupId, data: formData });

    if (res?.success) {
      setOpen(false);
      setFormData({ fullName: "", email: "", password: "" });
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Team Leader
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Team Leader</DialogTitle>
          <DialogDescription>
            Create a user account for the Team Leader. They will be strictly
            bound to this group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Simple, memorable password"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isAssigningTeamLeader}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAssigningTeamLeader}>
              {isAssigningTeamLeader && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create & Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
