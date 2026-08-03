"use client";

import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Tent,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserProfile } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";

interface DashboardNavbarProps {
  user: UserProfile;
}

export default function DashboardNavbar({ user }: DashboardNavbarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") || "overview";

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : user.email.substring(0, 2).toUpperCase();

  const displayName =
    user.displayName || user.fullName || user.email.split("@")[0];

  const navigate = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const navigateMobile = (tab: string) => {
    navigate(tab);
    setIsMobileMenuOpen(false);
  };

  const items = [
    {
      label: "Overview",
      value: "overview",
      icon: LayoutDashboard,
    },
    {
      label: "Billing",
      value: "billing",
      icon: CreditCard,
    },
    {
      label: "My Festivals",
      value: "festivals",
      icon: Tent,
    },
    {
      label: "Settings",
      value: "settings",
      icon: Settings,
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b border-border bg-background/80">
      <div className="mx-auto max-w-7xl px-6 h-18 flex items-center justify-between">
        <Link
          href={"/profile"}
          className="flex items-center gap-2 font-black text-2xl tracking-tighter uppercase bg-gradient-to-r from-primary via-secondary to-primary/80 bg-clip-text text-transparent hover:opacity-90 transition-opacity"
        >
          Greenroom
        </Link>

        <div className="flex items-center gap-2">
          {/* Mobile View: Sidebar / Drawer */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full focus-visible:ring-0"
                >
                  <Avatar className="h-10 w-10 border border-border shadow-sm hover:opacity-80 transition-opacity">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-sm font-semibold bg-primary/8 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="w-full">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full py-4 mt-4">
                  {/* User details header in drawer */}
                  <div className="flex flex-col items-start gap-4 mb-8 px-2 md:px-0">
                    <Avatar className="h-16 w-16 border border-border shadow-md">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-lg font-semibold bg-primary/8 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name, Email & Badge */}
                    <div className="space-y-1 w-full">
                      <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
                        {displayName}
                      </h1>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>

                      {user.accountType && (
                        <div className="pt-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-medium px-2.5 py-0.5",
                              user.accountType === "INSTITUTIONAL"
                                ? "bg-primary/8 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {user.accountType}
                          </Badge>
                          {user.accountType === "PERSONAL" && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                              Upgrade to Institutional for campus features
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex-1">
                    <div className="mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </div>
                    <div className="flex flex-col space-y-1">
                      {items.map((item) => (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() => navigateMobile(item.value)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors w-full",
                            activeTab === item.value
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border px-3">
                    <LogoutButton className="w-full justify-start text-sm font-normal py-2 h-auto text-red-600 hover:text-red-600 hover:bg-red-100/50">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </LogoutButton>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop View: DropdownMenu */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full focus-visible:ring-0"
                >
                  <Avatar className="h-10 w-10 border border-border shadow-sm hover:opacity-80 transition-opacity">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-sm font-semibold bg-primary/8 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <div className="flex flex-col items-start gap-4 p-4">
                  <Avatar className="h-16 w-16 border border-border shadow-md">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-lg font-semibold bg-primary/8 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name, Email & Badge */}
                  <div className="space-y-1 w-full">
                    <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
                      {displayName}
                    </h1>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>

                    {user.accountType && (
                      <div className="pt-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-0.5",
                            user.accountType === "INSTITUTIONAL"
                              ? "bg-primary/8 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {user.accountType}
                        </Badge>
                        {user.accountType === "PERSONAL" && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                            Upgrade to Institutional for campus features
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <LogoutButton className="w-full justify-start text-sm font-normal px-2 py-1.5 h-auto text-red-600 hover:text-red-600 hover:bg-red-100/50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </LogoutButton>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
