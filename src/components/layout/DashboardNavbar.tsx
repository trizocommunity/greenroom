"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function DashboardNavbar() {
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
    },
    onSuccess: () => {
      // Clear client-side data if needed
      router.push("/");
      router.refresh();
      toast.success("Logged out successfully");
    },
    onError: () => {
      toast.error("Failed to log out");
    },
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl border-b border-slate-800 supports-backdrop-filter:bg-white-950/80">
      <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
        {/* Logo - Points to Profile (Home for logged in users) */}
        <Link href={"/profile"} className="text-2xl font-bold">
          Greenroom
        </Link>

        {/* Dashboard Actions */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => mutate()}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          Log Out
        </Button>
      </div>
    </header>
  );
}
