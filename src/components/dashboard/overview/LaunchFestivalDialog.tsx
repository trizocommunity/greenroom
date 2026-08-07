"use client";

import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";

interface LaunchFestivalDialogProps {
  festivalSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LaunchFestivalDialog({
  festivalSlug,
  open,
  onOpenChange,
}: LaunchFestivalDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLaunch = () => {
    // Navigate to settings for now, as launching might require more configuration
    // (e.g. enabling public site, changing status)
    onOpenChange(false);
    toast.success("Navigating to settings to configure launch...");
    router.push(`/dashboard/${festivalSlug}/settings`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Launch Festival
          </DialogTitle>
          <DialogDescription>
            You are about to launch your festival. This will make it visible to
            all participants and staff.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted p-4 rounded-md my-2">
          <p className="text-sm text-muted-foreground">
            Ensure you have completed all previous setup steps before launching.
            Once launched, you can enable the public site for participants to view
            schedules and results.
          </p>
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLaunch} disabled={isPending}>
            {isPending ? "Launching..." : "Go to Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
