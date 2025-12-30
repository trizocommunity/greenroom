"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useParticipants } from "@/hooks/useParticipants";
import { cn } from "@/lib/utils";

interface ParticipantDialogProps {
  festivalId: string;
  participant?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
}

export function ParticipantDialog({
  festivalId,
  participant,
  trigger,
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

  // Filter categories to only show INDIVIDUAL type for creation/editing
  // Unless we are editing an existing one that is somehow GENERAL? (Unexpected but handle gracefully?)
  // Requirement: "Show only Individual-type categories"
  const individualCategories = categories.filter(
    (c: any) => c.type === "INDIVIDUAL",
  );

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
        // Pre-select first group if only one exists
        // Pre-select first category? No, force user selection.
        setFormData({
          name: "",
          email: "",
          phone: "",
          groupId: groups.length === 1 ? groups[0].id : "",
          categoryId: "",
          gender: "MALE",
          registrationNumber: "",
        });
      }
    }
  }, [open, participant, groups]); // Added groups to dep to auto-select single group

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!formData.groupId || !formData.categoryId) {
      // Validation handled by HTML required? No, custom badges need manual check or disabling submit.
      return;
    }

    try {
      if (isEditing && participant) {
        await updateParticipant({ id: participant.id, data: formData });
      } else {
        await createParticipant(formData);
      }
      setOpen(false);
    } catch (error) {
      // Handled by hook
    }
  };

  const handleGroupSelect = (id: string) => {
    if (readOnly) return;
    setFormData({ ...formData, groupId: id });
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
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

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-hidden flex flex-col gap-4"
        >
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <fieldset
              disabled={readOnly}
              className="space-y-6 group-disabled:opacity-100 p-1"
            >
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground/80 border-b pb-2">
                  Festival Details
                </h3>

                {/* Group Selection */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                    Group <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 border rounded-md bg-muted/5">
                    {groups.map((group: any) => (
                      <button
                        type="button"
                        key={group.id}
                        onClick={() => handleGroupSelect(group.id)}
                        className={cn(
                          "cursor-pointer px-3 py-1.5 rounded-md border text-sm transition-all flex items-center gap-2",
                          formData.groupId === group.id
                            ? "bg-primary/10 border-primary text-primary font-semibold ring-1 ring-primary"
                            : "bg-background hover:bg-muted text-muted-foreground hover:border-primary/30",
                          readOnly && "cursor-default opacity-80",
                        )}
                        disabled={readOnly}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color || "#2563eb" }}
                        />
                        {group.name}
                      </button>
                    ))}
                    {groups.length === 0 && (
                      <p className="text-sm text-muted-foreground p-2">
                        No groups available.
                      </p>
                    )}
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {individualCategories.map((cat: any) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() =>
                          !readOnly &&
                          setFormData({ ...formData, categoryId: cat.id })
                        }
                        className={cn(
                          "cursor-pointer p-3 rounded-lg border text-sm transition-all flex flex-col items-start gap-1 hover:border-primary/50 text-left",
                          formData.categoryId === cat.id
                            ? "bg-primary/5 border-primary ring-1 ring-primary"
                            : "bg-card text-card-foreground hover:bg-muted/50",
                          readOnly && "cursor-default opacity-80",
                        )}
                        disabled={readOnly}
                      >
                        <span className="font-semibold">{cat.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {cat.code}
                        </Badge>
                      </button>
                    ))}
                    {individualCategories.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-full p-2">
                        No individual categories found.
                      </p>
                    )}
                  </div>
                </div>

                {/* Reg Number */}
                <div className="space-y-2">
                  <Label
                    htmlFor="registrationNumber"
                    className="text-xs uppercase text-muted-foreground font-semibold tracking-wider"
                  >
                    Registration Number (Optional)
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
                    placeholder="Leave empty for auto-generation"
                    className="bg-muted/5"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    If left empty, a unique ID will be generated automatically
                    (e.g. ABC-G-101).
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground/80 border-b pb-2">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <div className="flex flex-wrap gap-2">
                      {["MALE", "FEMALE", "OTHER"].map((gender) => (
                        <button
                          type="button"
                          key={gender}
                          onClick={() =>
                            !readOnly && setFormData({ ...formData, gender })
                          }
                          className={cn(
                            "cursor-pointer px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                            formData.gender === gender
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted text-muted-foreground",
                            readOnly && "cursor-default opacity-80",
                          )}
                          disabled={readOnly}
                        >
                          {gender.charAt(0) + gender.slice(1).toLowerCase()}
                          {formData.gender === gender && (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+91 ..."
                    />
                  </div>
                </div>
              </div>
            </fieldset>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                type="submit"
                disabled={
                  isLoading || !formData.groupId || !formData.categoryId
                }
              >
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
