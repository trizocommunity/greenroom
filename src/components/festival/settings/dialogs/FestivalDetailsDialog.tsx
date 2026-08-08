"use client";

import axios from "axios";
import { Loader2, Pencil } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUpdateFestival } from "@/api/client/festivals";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { TimezoneSelect } from "@/components/onboarding/TimezoneSelect";
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
import { getFestivalDurationDays } from "@/config/pricing";
import { toDateOrNull } from "@/core/datetime";
import { MS } from "@/core/datetime/constants";
import { slugify } from "@/core/utils/slug";
import { toast } from "@/lib/toast";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

interface FestivalDetailsDialogProps {
  festival: {
    id: string;
    name: string;
    description?: string | null;
    tagline?: string | null;
    location?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    slug: string;
    timezone?: string;
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
  const [tagline, setTagline] = useState(festival.tagline || "");
  const [location, setLocation] = useState(festival.location || "");
  const [slug, setSlug] = useState(festival.slug || "");
  const [timezone, setTimezone] = useState(festival.timezone || "");
  const [serverSlugError, setServerSlugError] = useState<string | null>(null);
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

  const displaySlugError = slugError || serverSlugError;

  const durationStart = festival.createdAt
    ? (toDateOrNull(festival.createdAt) ?? new Date())
    : new Date();

  const existingEndDate = festival.endDate
    ? toDateOrNull(festival.endDate)
    : null;

  const totalDays = getFestivalDurationDays();
  const durationEnd = existingEndDate
    ? new Date(existingEndDate.getTime() + totalDays * MS.day)
    : dateRange.from
      ? new Date(dateRange.from.getTime() + totalDays * 2 * MS.day)
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
    setServerSlugError(null);
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
        tagline: tagline.trim() || undefined,
        location: location.trim() || undefined,
        startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
        slug: slugChanged ? nextSlug : undefined,
        timezone: timezone || "",
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
    } catch (error: any) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message
        : error?.message;

      if (
        message &&
        (message.toLowerCase().includes("subdomain") ||
          message.toLowerCase().includes("slug") ||
          message.toLowerCase().includes("taken") ||
          message.toLowerCase().includes("unique"))
      ) {
        setServerSlugError(
          "This subdomain is already taken. Please choose another.",
        );
      } else {
        toast.error(message || "Failed to update festival details");
      }
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
      <DrawerContent className="p-0 sm:p-0 gap-0">
        <div className="mx-auto w-full max-w-2xl flex flex-col h-full overflow-hidden">
          <DrawerHeader className="shrink-0 py-4 sm:py-6 pb-2 border-b">
            <DrawerTitle>Festival Details</DrawerTitle>
            <DrawerDescription>
              Core identity and timing of your festival.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
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
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                maxLength={140}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A short motto shown on your public homepage"
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
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setServerSlugError(null);
                }}
                placeholder="summer-arts-2025"
                className={
                  displaySlugError
                    ? "border-destructive focus-visible:ring-destructive/20"
                    : undefined
                }
              />
              {displaySlugError ? (
                <p className="text-xs text-destructive">{displaySlugError}</p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">
                  {origin || "yourapp.com"}/{slug || "your-subdomain"}
                </p>
              )}
              {slug !== festival.slug && !displaySlugError && (
                <p className="text-xs text-amber-600">
                  Changing this will move your festival to a new URL and
                  redirect you there after saving.
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

            <div className="space-y-2 flex flex-col pt-1">
              <Label htmlFor="timezone" className="mb-1">
                Timezone
              </Label>
              <TimezoneSelect value={timezone} onChange={setTimezone} />
              <p className="text-xs text-muted-foreground">
                All festival deadlines and schedules will use this timezone.
              </p>
            </div>
          </div>

          <DrawerFooter className="shrink-0 border-t">
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
