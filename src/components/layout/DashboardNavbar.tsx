"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function DashboardNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl border-b border-white/10 bg-background/80">
      <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
        {/* Logo - Points to Profile (Home for logged in users) */}
        <Link
          href={"/profile"}
          className="text-2xl font-black uppercase tracking-tighter text-foreground"
        >
          Greenroom
        </Link>
        {/* Dashboard Actions */}
        <LogoutButton />
      </div>
    </header>
  );
}
