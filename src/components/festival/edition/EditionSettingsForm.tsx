"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateEditionAction } from "@/server/actions/edition.actions";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface EditionSettingsFormProps {
  edition: {
    id: string;
    festivalId: string;
    name: string | null;
    slug: string;
    startDate: string | Date;
    endDate: string | Date;
    status: string;
    number: number;
    description?: string | null;
    theme?: string | null;
    venue?: string | null;
    location?: string | null;
  };
  festivalSlug: string;
  onSuccess?: (newSlug?: string) => void;
}

export function EditionSettingsForm({
  edition,
  festivalSlug,
  onSuccess,
}: EditionSettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.append("id", edition.id);
    formData.append("festivalId", edition.festivalId);

    try {
      const result = await updateEditionAction(formData);

      if (result?.error) {
        if (typeof result.error === "string") {
          toast.error(result.error);
        } else {
          toast.error("Validation failed. Please check inputs.");
        }
      } else if (result?.success) {
        toast.success("Edition updated successfully.");

        if (onSuccess) {
          onSuccess(result.newSlug);
        } else if (result.newSlug && result.newSlug !== edition.slug) {
          // Default redirection for organizers
          toast.info("URL updated. Redirecting...");
          router.push(`/festival/${festivalSlug}/${result.newSlug}/settings`);
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Edition Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={edition.name || `Edition ${edition.number}`}
            placeholder="e.g. Winter 2025"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <div className="relative">
            <Input
              id="slug"
              name="slug"
              defaultValue={edition.slug}
              placeholder="winter-2025"
              className="font-mono text-purple-500 border-purple-500/50 bg-purple-500/10"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            /festival/{festivalSlug}/
            <span className="text-purple-400">{edition.slug}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={
              edition.startDate instanceof Date
                ? edition.startDate.toISOString().split("T")[0]
                : new Date(edition.startDate).toISOString().split("T")[0]
            }
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={
              edition.endDate instanceof Date
                ? edition.endDate.toISOString().split("T")[0]
                : new Date(edition.endDate).toISOString().split("T")[0]
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={edition.description || ""}
          placeholder="Brief overview of this edition..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="theme">Theme</Label>
          <Input
            id="theme"
            name="theme"
            defaultValue={edition.theme || ""}
            placeholder="e.g. Sustainability"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location">City/Location</Label>
          <Input
            id="location"
            name="location"
            defaultValue={edition.location || ""}
            placeholder="e.g. New York, NY"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="venue">Venue Name</Label>
        <Input
          id="venue"
          name="venue"
          defaultValue={edition.venue || ""}
          placeholder="e.g. Grand Convention Center"
        />
      </div>

      <div className="grid gap-2">
        <Label>Status</Label>
        <div className="p-2 border rounded-md text-sm bg-muted/50 uppercase font-medium">
          {edition.status}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
