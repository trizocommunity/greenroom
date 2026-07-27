"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useParticipantLogout } from "@/api/client";
import { Button } from "@/components/ui/button";

export function ParticipantLogoutButton({
  festivalSlug,
  variant = "outline",
}: {
  festivalSlug: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}) {
  const router = useRouter();
  const logoutMutation = useParticipantLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Logged out successfully");
        router.push(`/${festivalSlug}`);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to logout");
      },
    });
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
      className="gap-2 rounded-full font-medium"
    >
      <LogOut size={15} />
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
