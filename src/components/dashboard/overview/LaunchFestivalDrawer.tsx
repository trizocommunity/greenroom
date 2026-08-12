"use client";

import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "@/lib/toast";

interface LaunchFestivalDrawerProps {
  festivalSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LaunchFestivalDrawer({
  festivalSlug,
  open,
  onOpenChange,
}: LaunchFestivalDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLaunch = () => {
    // Navigate to settings for now, as launching might require more configuration
    // (e.g. enabling public site, changing status)
    onOpenChange(false);
    toast.success("Navigating to settings to configure launch...");
    router.push(`/dashboard/${festivalSlug}/settings?tab=festival-live`);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Launch Festival
            </DrawerTitle>
            <DrawerDescription>
              You are about to launch your festival. This will make it visible
              to all participants and staff.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">
                Ensure you have completed all previous setup steps before
                launching. Once launched, you can enable the public site for
                participants to view schedules and results.
              </p>
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleLaunch} disabled={isPending}>
              {isPending ? "Launching..." : "Go to Settings"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
