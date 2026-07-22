"use client";

import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUpdateFestival } from "@/api/client/festivals";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { Textarea } from "@/components/ui/textarea";
import { toDateOrNull } from "@/core/utils/date-time";

interface FestivalDetailsDialogProps {
  festival: {
    id: string;
    name: string;
    description?: string | null;
    location?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    slug: string;
    createdAt?: Date | string | null;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function FestivalDetailsDialog({
  festival,
  onSuccess,
  trigger,
}: FestivalDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(festival.name || "");
  const [description, setDescription] = useState(festival.description || "");
  const [location, setLocation] = useState(festival.location || "");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: toDateOrNull(festival.startDate) ?? undefined,
    to: toDateOrNull(festival.endDate) ?? undefined,
  });
  const updateFestival = useUpdateFestival(festival.id);

  const durationStart = festival.createdAt
    ? (toDateOrNull(festival.createdAt) ?? new Date())
    : new Date();

  const existingEndDate = festival.endDate
    ? toDateOrNull(festival.endDate)
    : null;

  const durationEnd = existingEndDate
    ? new Date(existingEndDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : dateRange.from
      ? new Date(dateRange.from.getTime() + 180 * 24 * 60 * 60 * 1000)
      : undefined;

  const validateDates = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select valid start and end dates.");
      return false;
    }
    if (dateRange.from > dateRange.to) {
      toast.error("Start date must be before end date.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Festival name is required.");
      return;
    }
    if (!validateDates()) return;

    try {
      await updateFestival.mutateAsync({
        id: festival.id,
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
      });
      toast.success("Festival details updated");
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to update festival details");
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Festival Details</DialogTitle>
          <DialogDescription>
            Core identity and timing of your festival.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Festival Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Summer Arts 2025"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe your festival..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Festival Dates</Label>
            <DateRangePicker
              id="dateRange"
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select date range"
              from={durationStart}
              to={durationEnd}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Venue / City</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateFestival.isPending}>
            {updateFestival.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
