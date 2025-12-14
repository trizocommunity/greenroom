"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FestivalPublicData } from "./FestivalContext";

const navItems = [
  { name: "About", href: "/about" },
  { name: "News", href: "/news" },
  { name: "Gallery", href: "/gallery" },
  { name: "Sessions", href: "/sessions" },
  { name: "Results", href: "/results" },
];

interface FestivalNavbarProps {
  festival: FestivalPublicData;
  isLoggedIn?: boolean;
}

export function FestivalNavbar({ festival, isLoggedIn = false }: FestivalNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  
  // Extract the current page from pathname (e.g., /festival/slug/about -> /about)
  const currentPage = pathname.replace(`/festival/${festival.slug}`, '') || '/';

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border"
      style={{ 
        '--festival-accent': festival.accentColor 
      } as React.CSSProperties}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Festival Logo / Name */}
        <Link href={`/festival/${festival.slug}`} className="flex items-center gap-3 group">
          {festival.logo ? (
            <img 
              src={festival.logo} 
              alt={festival.name}
              className="h-10 w-10 object-contain rounded"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded flex items-center justify-center font-bold text-lg text-white"
              style={{ backgroundColor: festival.accentColor }}
            >
              {festival.name.charAt(0)}
            </div>
          )}
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            {festival.name}
          </span>
        </Link>

        {/* Desktop Nav - Center */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = currentPage === item.href || (currentPage === '/' && item.href === '/about');
            return (
              <Link
                key={item.href}
                href={`/festival/${festival.slug}${item.href}`}
                className="relative py-2"
              >
                <span className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="festival-navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: festival.accentColor }}
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
            <Link href="/profile">
              <Button size="sm" className="gap-2" style={{ backgroundColor: festival.accentColor }}>
                <LayoutDashboard size={16} />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn size={16} />
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
          style={{ color: festival.accentColor }}
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
              {navItems.map((item) => {
                const isActive = currentPage === item.href;
                return (
                  <Link
                    key={item.href}
                    href={`/festival/${festival.slug}${item.href}`}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-lg font-medium transition-colors",
                      isActive 
                        ? "text-white" 
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    style={isActive ? { backgroundColor: festival.accentColor } : undefined}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t pt-4 mt-2">
                {isLoggedIn ? (
                  <Link href="/profile" onClick={() => setIsOpen(false)}>
                    <Button className="w-full gap-2" style={{ backgroundColor: festival.accentColor }}>
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login" onClick={() => setIsOpen(false)}>
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
