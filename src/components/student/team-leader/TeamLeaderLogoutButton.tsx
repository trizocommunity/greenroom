"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTeamLeaderLogout } from "@/api/client/team-leader";

export function TeamLeaderLogoutButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();

  const logoutMutation = useTeamLeaderLogout();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Logout
    </Button>
  );
}
