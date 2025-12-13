"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Features", href: "/features" },
  { name: "Contact", href: "/contact" },
];

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
             G
          </div>
          <span className="font-bold text-xl tracking-tighter uppercase">Greenroom</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative py-2"
              >
                <span className={cn(
                  "text-sm font-semibold uppercase tracking-wide transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
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
            )
          })}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Link href="/profile">
               <Button size="sm" className="uppercase font-bold tracking-wide gap-2">
                 <User size={16} />
                 Profile
               </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                 <Button variant="ghost" size="sm" className="uppercase font-bold tracking-wide">Log In</Button>
              </Link>
              <Link href="/contact">
                <Button size="sm" className="uppercase font-bold tracking-wide rounded-none px-6">Get Demo</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-primary"
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
             <div className="p-6 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-lg font-bold uppercase tracking-wide py-2 border-b border-gray-50 last:border-0",
                    pathname === item.href ? "text-primary pl-2 border-l-4 border-primary" : "text-gray-400"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 mt-4">
                 {user ? (
                   <Link href="/profile" onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-center uppercase font-bold rounded-none gap-2">
                        <User size={16} />
                        Profile
                      </Button>
                   </Link>
                 ) : (
                   <>
                     <Link href="/login" onClick={() => setIsOpen(false)}>
                       <Button variant="outline" className="w-full justify-center uppercase font-bold rounded-none">Log In</Button>
                     </Link>
                     <Link href="/contact" onClick={() => setIsOpen(false)}>
                       <Button className="w-full justify-center uppercase font-bold rounded-none">Request Demo</Button>
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
