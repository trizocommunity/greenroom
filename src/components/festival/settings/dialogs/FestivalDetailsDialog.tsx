"use client";

import axios from "axios";
import { Loader2, Pencil } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUpdateFestival } from "@/api/client/festivals";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDateOrNull } from "@/core/datetime";
import { slugify } from "@/core/utils/slug";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

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
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(festival.name || "");
  const [description, setDescription] = useState(festival.description || "");
  const [location, setLocation] = useState(festival.location || "");
  const [slug, setSlug] = useState(festival.slug || "");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: toDateOrNull(festival.startDate) ?? undefined,
    to: toDateOrNull(festival.endDate) ?? undefined,
  });
  const updateFestival = useUpdateFestival(festival.id);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const slugError =
    slug.length > 0 && !SLUG_PATTERN.test(slug)
      ? "Only lowercase letters, numbers and dashes are allowed."
      : slug.length > 0 && slug.length < 3
        ? "Subdomain must be at least 3 characters."
        : null;

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
    const nextSlug = slug.trim().toLowerCase();
    if (!nextSlug) {
      toast.error("Subdomain is required.");
      return;
    }
    if (!SLUG_PATTERN.test(nextSlug) || nextSlug.length < 3) {
      toast.error(slugError ?? "Please enter a valid subdomain before saving.");
      return;
    }
    const slugChanged = nextSlug !== festival.slug;

    try {
      await updateFestival.mutateAsync({
        id: festival.id,
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
        slug: slugChanged ? nextSlug : undefined,
      });
      setOpen(false);
      onSuccess?.();

      if (slugChanged && pathname) {
        toast.success(
          `Subdomain updated to "${nextSlug}". Redirecting to the new URL…`,
        );
        router.push(pathname.replace(`/${festival.slug}`, `/${nextSlug}`));
      } else {
        toast.success("Festival details updated");
      }
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error?.message;
      toast.error(message || "Failed to update festival details");
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger ?? defaultTrigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Festival Details</DrawerTitle>
          <DrawerDescription>
            Core identity and timing of your festival.
          </DrawerDescription>
        </DrawerHeader>

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
            <Label htmlFor="slug">Subdomain</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="summer-arts-2025"
              className={slugError ? "border-destructive" : undefined}
            />
            {slugError ? (
              <p className="text-xs text-destructive">{slugError}</p>
            ) : (
              <p className="text-xs text-muted-foreground truncate">
                {origin || "yourapp.com"}/{slug || "your-subdomain"}
              </p>
            )}
            {slug !== festival.slug && !slugError && (
              <p className="text-xs text-amber-600">
                Changing this will move your festival to a new URL and redirect
                you there after saving.
              </p>
            )}
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

        <DrawerFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateFestival.isPending}>
            {updateFestival.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
