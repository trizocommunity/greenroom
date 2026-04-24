"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ProfileSidebarContent } from "@/components/profile/ProfileSidebarContent";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { UserProfile } from "@/core/types/app-enums";

interface DashboardNavbarProps {
  user: UserProfile;
}

export default function DashboardNavbar({ user }: DashboardNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl border-b border-white/10 bg-background/80">
      <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
        <Link
          href={"/profile"}
          className="text-2xl font-black uppercase tracking-tighter text-foreground"
        >
          Greenroom
        </Link>
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
              <div className="py-6 h-full">
                <ProfileSidebarContent
                  user={user}
                  className="px-2"
                  onLinkClick={() => setIsOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden md:block">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
