"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/use-auth";

export function LogoutButton() {
  const router = useRouter();
  const { mutate, isPending } = useLogout();

  const handleLogout = () => {
    mutate(undefined);
  };

  return (
    <Button variant="ghost" onClick={handleLogout} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Logout
    </Button>
  );
}
