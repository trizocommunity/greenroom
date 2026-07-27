"use client";

import { ArrowUpRight, Bell, Crown, Menu, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";

interface StudentNavbarProps {
  festival: {
    slug: string;
    name: string;
  };
  student: {
    isTeamLeader: boolean;
    name: string;
  };
  studentSlugParam: string;
  studentMainHref: string;
  assignedProgrammesTopStatus?: ProgrammeStatus | null;
}

export function StudentNavbar({
  festival,
  student,
  studentSlugParam,
  studentMainHref,
  assignedProgrammesTopStatus = null,
}: StudentNavbarProps) {
  const pathname = usePathname();

  const linkBase = `/${festival.slug}/${studentSlugParam}`;
  const isTeamLeader = student.isTeamLeader;

  const menuItems: Array<{
    label: string;
    href: string;
    badge?: ReactNode;
  }> = [];

  if (isTeamLeader) {
    menuItems.push(
      {
        label: "Assign Programmes",
        href: `${linkBase}/leader/assign-programmes`,
      },
      { label: "My Students", href: `${linkBase}/leader/my-students` },
      { label: "Programmes", href: `${linkBase}/leader/all-programmes` },
      { label: "Leaderboard", href: `${linkBase}/leader/leaderboard` },
    );
  } else {
    menuItems.push(
      {
        label: "Programmes",
        href: `${linkBase}/assigned-programmes`,
        badge: assignedProgrammesTopStatus ? (
          <ProgrammeStatusBadge
            status={assignedProgrammesTopStatus}
            className="h-5 px-2"
          />
        ) : undefined,
      },
      { label: "Students", href: `${linkBase}/my-group` },
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between">
        <Link
          href={studentMainHref}
          className="flex items-center gap-3 min-w-0"
        >
          <div className="min-w-0 flex items-center gap-2">
            <div
              className="h-8 w-8 uppercase rounded-full flex border border-border items-center justify-center font-bold text-sm text-primary-foreground bg-primary shrink-0"
              aria-hidden
            >
              {student.name?.charAt(0) ?? "S"}
            </div>
            <div className="min-w-0 leading-tight hidden lg:block">
              {isTeamLeader ? (
                <Badge
                  variant="secondary"
                  className=" bg-amber-500/15 text-amber-800 border-amber-500/30"
                >
                  <span className="inline-flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5" />
                    Team Leader
                  </span>
                </Badge>
              ) : null}
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 md:gap-3">
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-2",
                    active ? "text-foreground bg-muted/70" : "",
                  )}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge}
                </Link>
              );
            })}
          </div>

          {/* Notification icon only (no implementation required). */}
          <Link
            href={
              isTeamLeader
                ? `${linkBase}/leader/notifications`
                : `${linkBase}/notifications`
            }
          >
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </Link>
          <Link className="lg:hidden" href={studentMainHref}>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Profile"
            >
              <User className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/${festival.slug}`}>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Festival Live"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>

          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  aria-label="Open student menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="p-4 border-b">
                  <div className="text-sm font-semibold">Menu</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {student.isTeamLeader ? "Team leader" : "Student"}
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {menuItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center justify-between gap-2",
                            active ? "text-foreground bg-muted/70" : "",
                          )}
                        >
                          <span className="truncate">{item.label}</span>
                          {item.badge}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}
