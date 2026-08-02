"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PUBLIC_CONTAINER } from "@/components/festival/public/PublicSection";
import { cn } from "@/core/utils/cn";
import { isBasicTier } from "@/features/plan-features/services/tier";
import type { FestivalPublicData } from "./FestivalContext";

const navItems = [
  { name: "Home", href: "/" },
  { name: "News", href: "/news" },
  { name: "Media", href: "/media" },
  { name: "Schedule", href: "/schedule" },
  { name: "Results", href: "/results" },
];

interface FestivalNavbarProps {
  festival: FestivalPublicData;
}

export function FestivalNavbar({ festival }: FestivalNavbarProps) {
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
        // Height stays fixed so the page below never shifts on scroll; only
        // the surface behind it changes.
        "fixed top-0 left-0 right-0 z-50 h-16 transition-colors duration-300",
        isScrolled
          ? "border-b border-border bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div
        className={`${PUBLIC_CONTAINER} h-16 flex items-center justify-between gap-4`}
      >
        {/* Festival mark */}
        <Link href={linkBase} className="flex min-w-0 items-center gap-2.5">
          {festival.logo ? (
            <Image
              src={festival.logo}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {festival.name.charAt(0)}
            </span>
          )}
          <span className="hidden truncate text-[15px] font-semibold tracking-tight text-heading sm:block">
            {festival.name}
          </span>
        </Link>

        {/* Sections */}
        <nav className="hidden h-16 items-center md:flex">
          {activeNavItems.map((item) => {
            const href =
              item.href === "/" ? linkBase : `${linkBase}${item.href}`;
            const isActive =
              currentPage === item.href ||
              (currentPage === "/" && item.href === "/");

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "relative flex h-full items-center px-3.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-heading"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.name}
                {isActive && (
                  <motion.span
                    layoutId="festival-navbar-indicator"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center md:flex">
          <Link
            href={`/${festival.slug}/login`}
            className="text-sm font-medium text-primary transition-opacity hover:opacity-70"
          >
            Participant login
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          className="-mr-2 shrink-0 rounded-full p-2 text-foreground md:hidden"
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
            className="md:hidden overflow-hidden border-b border-border bg-background/95 backdrop-blur-xl"
          >
            <div className={`${PUBLIC_CONTAINER} py-3`}>
              <nav className="divide-y divide-border">
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
                        "block py-3 text-[15px] font-medium transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {item.name}
                    </Link>
                  );
                })}
                <Link
                  href={`/${festival.slug}/login`}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 text-[15px] font-medium text-primary"
                >
                  Participant login
                </Link>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
