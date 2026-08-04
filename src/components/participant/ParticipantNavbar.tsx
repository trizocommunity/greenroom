"use client";

import { ArrowUpRight, Bell, Crown, Menu, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_CONTAINER, StatusPill } from "@/components/app/AppSection";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";

interface ParticipantNavbarProps {
  festival: {
    slug: string;
    name: string;
  };
  participant: {
    isTeamLeader: boolean;
    name: string;
  };
  participantSlugParam: string;
  participantMainHref: string;
  assignedProgrammesTopStatus?: ProgrammeStatus | null;
}

export function ParticipantNavbar({
  festival,
  participant,
  participantSlugParam,
  participantMainHref,
  assignedProgrammesTopStatus = null,
}: ParticipantNavbarProps) {
  const pathname = usePathname();

  const linkBase = `/${festival.slug}/${participantSlugParam}`;
  const isTeamLeader = participant.isTeamLeader;

  const menuItems: Array<{
    label: string;
    href: string;
    badge?: ReactNode;
  }> = [];

  if (isTeamLeader) {
    menuItems.push(
      { label: "Assign", href: `${linkBase}/assign-programmes` },
      { label: "Participants", href: `${linkBase}/my-participants` },
      { label: "Programmes", href: `${linkBase}/all-programmes` },
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
      { label: "Participants", href: `${linkBase}/my-group` },
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className={cn(APP_CONTAINER, "flex h-16 items-center gap-4")}>
        {/* Identity */}
        <Link
          href={participantMainHref}
          className="flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-primary-foreground"
            aria-hidden
          >
            {participant.name?.charAt(0) ?? "P"}
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-[15px] font-semibold tracking-tight text-heading">
              {participant.name}
            </span>
            {isTeamLeader && (
              <StatusPill tone="warning" icon={Crown} className="mt-0.5 px-2">
                Team leader
              </StatusPill>
            )}
          </span>
        </Link>

        {/* Sections */}
        <nav className="mx-auto hidden h-16 items-center lg:flex">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-full items-center gap-2 px-3.5 text-sm font-medium transition-colors",
                  active
                    ? "text-heading"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Utilities */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <IconLink
            href={`${linkBase}/notifications`}
            label="Notifications"
            icon={Bell}
          />
          <IconLink
            href={participantMainHref}
            label={isTeamLeader ? "Dashboard" : "Profile"}
            icon={User}
            className="lg:hidden"
          />
          <IconLink
            href={`/${festival.slug}`}
            label="Festival site"
            icon={ArrowUpRight}
          />

          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="p-0">
                <div className="border-b border-border p-5">
                  <p className="text-[15px] font-semibold tracking-tight text-heading">
                    {participant.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isTeamLeader ? "Team leader" : "Participant"} ·{" "}
                    {festival.name}
                  </p>
                </div>
                <nav className="divide-y divide-border px-5">
                  {menuItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-between gap-3 py-3.5 text-[15px] font-medium transition-colors",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          <span className="truncate">{item.label}</span>
                          {item.badge}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function IconLink({
  href,
  label,
  icon: Icon,
  className,
}: {
  href: string;
  label: string;
  icon: typeof Bell;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
        aria-label={label}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </Link>
  );
}
