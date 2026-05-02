"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/core/http/csrf-fetch";

export function TeamLeaderLogoutButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await csrfFetch("/api/team-leader/logout", { method: "POST" });
        router.push(redirectTo);
        router.refresh();
      }}
    >
      Logout
    </Button>
  );
}
