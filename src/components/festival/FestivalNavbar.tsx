"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getResolvedTier, isBasicTier } from "@/lib/tier";
import { cn } from "@/lib/utils";
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
          ? "bg-background/95 backdrop-blur-xl border-b border-border shadow-sm h-16"
          : "bg-transparent h-20",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Festival Logo / Name */}
        <Link href={linkBase} className="flex items-center gap-3 group">
          {festival.logo ? (
            <Image
              src={festival.logo}
              alt={festival.name}
              width={40}
              height={40}
              className="h-10 w-10 object-contain rounded"
            />
          ) : (
            <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-lg text-primary-foreground bg-primary">
              {festival.name.charAt(0)}
            </div>
          )}
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            {festival.name}
          </span>
        </Link>

        {/* Desktop Nav - Center */}
        <nav className="hidden md:flex items-center gap-6">
          {activeNavItems.map((item) => {
            // Handle Home specially
            const href =
              item.href === "/" ? linkBase : `${linkBase}${item.href}`;
            const isActive =
              currentPage === item.href ||
              (currentPage === "/" && item.href === "/");

            return (
              <Link key={item.href} href={href} className="relative py-2">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="festival-navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Side - Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link href={`/dashboard/${festival.slug}`}>
              <Button
                size="sm"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn size={16} />
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          className="md:hidden p-2 text-primary hover:bg-muted rounded-md"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
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
            <div className="p-4 flex flex-col gap-2">
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
                      "px-4 py-3 rounded-lg font-medium transition-colors",
                      isActive
                        ? "text-primary-foreground bg-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t pt-4 mt-2">
                {isLoggedIn ? (
                  <Button
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = `/dashboard/${festival.slug}`;
                    }}
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Button>
                ) : (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(pathname)}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <LogIn size={16} />
                      Login
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
