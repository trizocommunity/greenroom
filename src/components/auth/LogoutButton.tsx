"use client";

import { Loader2 } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/use-auth";

export function LogoutButton(props: React.ComponentProps<typeof Button>) {
  const { mutate, isPending } = useLogout();

  const handleLogout = () => {
    mutate(undefined);
  };

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={isPending}
      {...props}
    >
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {props.children || "Logout"}
    </Button>
  );
}
