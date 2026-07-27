"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { isBasicTier } from "@/features/plan-features/services/tier";
import type { FestivalPublicData } from "./FestivalContext";

const navItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "News", href: "/news" },
  { name: "Gallery", href: "/gallery" },
  { name: "Sessions", href: "/sessions" },
  { name: "Programmes", href: "/programmes" },
  { name: "Results", href: "/results" },
];

interface FestivalNavbarProps {
  festival: FestivalPublicData;
  isLoggedIn?: boolean;
}

export function FestivalNavbar({
  festival,
  isLoggedIn = false,
}: FestivalNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Base URL for navigation links
  // Public site is always at /festival-slug (or subdomain root)
  const linkBase = `/${festival.slug}`;

  // Current page extraction
  const currentPage = pathname.replace(linkBase, "") || "/";

  const isBasic = isBasicTier(festival.tier);
  const activeNavItems = isBasic
    ? [
        { name: "Home", href: "/" },
        { name: "Results", href: "#results" },
      ]
    : navItems;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-premium h-14"
          : "bg-transparent border-b border-transparent h-16",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Festival Logo / Name */}
        <Link href={linkBase} className="flex items-center gap-2.5 group">
          {festival.logo ? (
            <Image
              src={festival.logo}
              alt={festival.name}
              width={36}
              height={36}
              className="h-9 w-9 object-contain rounded-lg"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm text-primary-foreground bg-primary">
              {festival.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-base tracking-tight hidden sm:block text-heading">
            {festival.name}
          </span>
        </Link>

        {/* Desktop Nav - Center */}
        <nav className="hidden md:flex items-center gap-1">
          {activeNavItems.map((item) => {
            // Handle Home specially
            const href =
              item.href === "/" ? linkBase : `${linkBase}${item.href}`;
            const isActive =
              currentPage === item.href ||
              (currentPage === "/" && item.href === "/");

            return (
              <Link key={item.href} href={href} className="relative">
                {isActive && (
                  <motion.span
                    layoutId="festival-navbar-indicator"
                    className="absolute inset-0 rounded-full bg-primary/8"
                    transition={{ type: "spring", stiffness: 350, damping: 32 }}
                  />
                )}
                <span
                  className={cn(
                    "relative block px-3.5 py-2 text-sm font-medium rounded-full transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side - Auth */}
        <div className="hidden md:flex items-center gap-3">
          <Link href={`/${festival.slug}/login`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full font-medium border-border"
            >
              Participant Login
            </Button>
          </Link>
          {isLoggedIn ? (
            <Link href={`/dashboard/${festival.slug}`}>
              <Button size="sm" className="gap-2 rounded-full font-medium">
                <LayoutDashboard size={15} />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full font-medium border-border"
              >
                <LogIn size={15} />
                Log in
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          className="md:hidden p-2 text-foreground hover:bg-muted rounded-full"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-1">
              {activeNavItems.map((item) => {
                const href =
                  item.href === "/" ? linkBase : `${linkBase}${item.href}`;
                const isActive = currentPage === item.href;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "px-4 py-2.5 rounded-full font-medium transition-colors text-sm",
                      isActive
                        ? "text-primary bg-primary/8"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t border-border pt-4 mt-2 flex flex-col gap-2">
                <Link
                  href={`/${festival.slug}/login`}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-full font-medium border-border"
                  >
                    Participant Login
                  </Button>
                </Link>
                {isLoggedIn ? (
                  <Button
                    className="w-full gap-2 rounded-full font-medium"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = `/dashboard/${festival.slug}`;
                    }}
                  >
                    <LayoutDashboard size={15} />
                    Dashboard
                  </Button>
                ) : (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(pathname)}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-full font-medium border-border"
                    >
                      <LogIn size={15} />
                      Log in
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
