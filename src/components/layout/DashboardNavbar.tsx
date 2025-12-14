"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-20 flex items-center justify-between">
        {/* Logo - Points to Profile (Home for logged in users) */}
        <Link href="/profile" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
             G
          </div>
          <span className="font-bold text-xl tracking-tighter uppercase">Greenroom</span>
        </Link>

        {/* Dashboard Actions */}
        <div className="flex items-center gap-4">
           {/* Placeholder for Logout or other dashboard actions. 
               The Profile page itself acts as the main view. */}
            <Button 
                variant="ghost" 
                size="sm" 
                className="uppercase font-bold tracking-wide gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => mutate()}
                disabled={isPending}
            >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                Log Out
            </Button>
           
            <Link href="/profile">
               <Button size="sm" className="uppercase font-bold tracking-wide gap-2">
                 <User size={16} />
                 Profile
               </Button>
            </Link>
        </div>
      </div>
    </header>
  );
}
