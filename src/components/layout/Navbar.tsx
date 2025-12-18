"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "/contact" },
];

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
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
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-300 bg-transparent",
        scrolled
          ? "bg-white/70 backdrop-blur-2xl border-b border-white/60 supports-backdrop-filter:bg-white/70"
          : "bg-transparent border-transparent",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold">
            Greenroom
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="relative py-2">
                <span
                  className={cn(
                    "text-sm font-medium tracking-wide text-foreground transition-colors hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Link href="/profile">
              <Button
                size="sm"
                className="uppercase font-bold tracking-wide gap-2"
              >
                <User size={16} />
                Profile
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm" className="font-medium text-foreground">
                  Log In
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="sm" className="px-6">
                  Get Demo
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-primary" onClick={() => setIsOpen(!isOpen)}>
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
            className="md:hidden bg-white/80 backdrop-blur-2xl border-b border-white/60 overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-base font-medium tracking-wide py-2 border-b border-slate-100 last:border-0",
                    pathname === item.href
                      ? "text-primary pl-2 border-l-4 border-primary"
                      : "text-slate-400",
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 mt-4">
                {user ? (
                  <Link href="/profile" onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-center gap-2">
                      <User size={16} />
                      Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full justify-center">
                        Log In
                      </Button>
                    </Link>
                    <Link href="/contact" onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-center">
                        Request Demo
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
