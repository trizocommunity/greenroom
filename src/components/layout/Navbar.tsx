"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/core/utils/cn";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

const navItems = [
  { name: "Product", href: "/features" },
  { name: "Services", href: "/services" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

interface NavbarProps {
  user?: { id: string } | null;
}

/**
 * A floating navigation island rather than a full-width bar: it detaches from
 * the top edge on scroll, picks up a border and blur, and leaves the hero's
 * background visible around it.
 */
export default function Navbar({ user: initialUser }: NavbarProps) {
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const [user, setUser] = React.useState<{ id: string } | null | undefined>(
    initialUser ?? undefined,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    if (initialUser != null) {
      setUser((prev) => (prev?.id === initialUser.id ? prev : initialUser));
      return;
    }
    if (currentUser) {
      setUser((prev) =>
        prev?.id === currentUser.id ? prev : { id: currentUser.id },
      );
    }
  }, [initialUser, currentUser]);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={cn(SITE_CONTAINER, "pt-3 sm:pt-4")}>
        {/* The island keeps its shape at all times — scrolling only deepens
            the surface behind it, it never changes the geometry. */}
        <div
          className={cn(
            "flex h-14 items-center gap-4 rounded-full border border-border px-3 backdrop-blur-xl transition-[background-color,box-shadow] duration-300 sm:px-4",
            scrolled
              ? "bg-background/80 shadow-premium"
              : "bg-background/40 shadow-none",
          )}
        >
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 pl-1 pr-2"
          >
            <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
              G
              <span className="animate-sheen absolute inset-y-0 -left-full w-full bg-white/25" />
            </span>
            <span className="text-[16px] font-semibold tracking-tight text-heading">
              Greenroom
            </span>
          </Link>

          <nav className="mx-auto hidden items-center md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-heading"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="navbar-indicator"
                      className="absolute inset-0 rounded-full bg-muted"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-1.5 md:flex">
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-16 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </>
            ) : isError ? null : user ? (
              <Link href="/profile">
                <Button
                  size="sm"
                  className="h-9 gap-2 rounded-full font-medium"
                >
                  <User size={15} />
                  Profile
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-full font-medium text-muted-foreground hover:text-foreground"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="sm"
                    className="group h-9 rounded-full pl-4 pr-3.5 font-medium shadow-primary-glow"
                  >
                    Get started
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            className="ml-auto rounded-full p-2 text-foreground md:hidden"
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(SITE_CONTAINER, "mt-2 md:hidden")}
          >
            {/* Every link closes the sheet — this component stays mounted
                across navigations, so it will not close itself. */}
            <div
              className="rounded-2xl border border-border bg-background/95 p-4 shadow-premium-lg backdrop-blur-xl"
              onClickCapture={() => setIsOpen(false)}
            >
              <nav className="divide-y divide-border">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block py-3 text-[15px] font-medium",
                      pathname === item.href
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="mt-4 flex flex-col gap-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-full rounded-full" />
                    <Skeleton className="h-10 w-full rounded-full" />
                  </>
                ) : isError ? null : user ? (
                  <Link href="/profile">
                    <Button className="w-full justify-center gap-2 rounded-full font-medium">
                      <User size={16} />
                      Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button
                        variant="outline"
                        className="w-full justify-center rounded-full font-medium"
                      >
                        Log in
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button className="w-full justify-center rounded-full font-medium shadow-primary-glow">
                        Get started
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
