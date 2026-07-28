"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ProfileSidebarContent } from "@/components/profile/ProfileSidebarContent";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserProfile } from "@/core/types/app-enums";

interface DashboardNavbarProps {
  user: UserProfile;
}

export default function DashboardNavbar({ user }: DashboardNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b border-border bg-background/80">
      <div className="mx-auto max-w-7xl px-6 h-18 flex items-center justify-between">
        <Link href={"/profile"} className="flex items-center gap-2 font-black text-2xl tracking-tighter uppercase bg-gradient-to-r from-primary via-secondary to-primary/80 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
          Greenroom
        </Link>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[400px]">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
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
        <div className="hidden md:flex items-center gap-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
