"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParticipants } from "@/hooks/useParticipants";
import { useGroups } from "@/hooks/useGroups";
import { useCategories } from "@/hooks/useCategories";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface ParticipantDialogProps {
  festivalId: string;
  participant?: any;
  trigger?: React.ReactNode;
  userGroup?: {
    id: string;
    name: string;
  };
  readOnly?: boolean;
}

export function ParticipantDialog({
  festivalId,
  participant,
  trigger,
  userGroup,
  readOnly = false,
}: ParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const { createParticipant, isCreating, updateParticipant, isUpdating } =
    useParticipants(festivalId);
  const { groups } = useGroups(festivalId);
  const { categories } = useCategories(festivalId);

  const isEditing = !!participant;
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    groupId: "",
    categoryId: "",
    gender: "MALE",
    registrationNumber: "",
  });

  useEffect(() => {
    if (open) {
      if (participant) {
        setFormData({
          name: participant.name || "",
          email: participant.email || "",
          phone: participant.phone || "",
          groupId: participant.groupId || "",
          categoryId: participant.categoryId || "",
          gender: participant.gender || "MALE",
          registrationNumber: participant.registrationNumber || "",
        });
      } else {
        // Create Mode
        setFormData({
          name: "",
          email: "",
          phone: "",
          groupId: userGroup?.id || "",
          categoryId: "",
          gender: "MALE",
          registrationNumber: "",
        });
      }
    }
  }, [open, participant, userGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    try {
      if (isEditing && participant) {
        await updateParticipant({ id: participant.id, data: formData });
      } else {
        await createParticipant(formData);
      }
      setOpen(false);
      // Reset form logic handled in useEffect on reopen, but good to clear here too
    } catch (error) {
      // Handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button disabled={readOnly}>
            <Plus className="mr-2 h-4 w-4" />
            Add Participant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Participant Details"
              : isEditing
                ? "Edit Participant"
                : "Add Participant"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "View participant information."
              : isEditing
                ? "Update participant details."
                : "Register a new participant."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset
            disabled={readOnly}
            className="space-y-4 group-disabled:opacity-100"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">
                  Reg. Number (Optional)
                </Label>
                <Input
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registrationNumber: e.target.value,
                    })
                  }
                  placeholder="Reg No"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Select
                  required
                  value={formData.groupId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, groupId: val })
                  }
                  disabled={!!userGroup || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group: any) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  required
                  value={formData.categoryId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, categoryId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(val) =>
                  setFormData({ ...formData, gender: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Register"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
