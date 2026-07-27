"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/core/utils/cn";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

const navItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "/contact" },
];

interface NavbarProps {
  user?: { id: string } | null;
}

export default function Navbar({ user: initialUser }: NavbarProps) {
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const [user, setUser] = React.useState<{ id: string } | null | undefined>(
    initialUser ?? undefined,
  );
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialUser != null) {
      setUser(initialUser);
      return;
    }
    if (currentUser) {
      setUser({ id: currentUser.id });
    }
  }, [initialUser, currentUser]);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    // For non-home pages, always show the solid navbar
    if (!isHome) {
      setScrolled(true);
      return;
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-premium"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-18 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white text-sm font-semibold shadow-primary-glow">
            G
          </span>
          <span className="text-lg font-semibold tracking-tight text-heading">
            Greenroom
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3.5 py-2 text-sm font-medium rounded-full transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-full bg-primary/8"
                    transition={{ type: "spring", stiffness: 350, damping: 32 }}
                  />
                )}
                <span className="relative">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          ) : isError ? null : user ? (
            <Link href="/profile">
              <Button size="sm" className="gap-2 rounded-full font-medium">
                <User size={16} />
                Profile
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium text-muted-foreground hover:text-foreground"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="sm"
                  className="px-5 rounded-full font-medium shadow-primary-glow"
                >
                  Request a demo
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          className="md:hidden p-2 text-foreground"
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
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-base font-medium py-3 border-b border-border last:border-0",
                    pathname === item.href
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 mt-5">
                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-full rounded-full" />
                    <Skeleton className="h-10 w-full rounded-full" />
                  </>
                ) : isError ? null : user ? (
                  <Link href="/profile" onClick={() => setIsOpen(false)}>
                    <Button className="w-full justify-center gap-2 rounded-full font-medium">
                      <User size={16} />
                      Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      <Button
                        variant="outline"
                        className="w-full justify-center rounded-full font-medium border-border hover:bg-muted"
                      >
                        Log in
                      </Button>
                    </Link>
                    <Link href="/contact" onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-center rounded-full font-medium shadow-primary-glow">
                        Request a demo
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
