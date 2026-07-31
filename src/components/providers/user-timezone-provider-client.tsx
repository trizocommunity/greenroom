"use client";

import type * as React from "react";

import { UserTimezoneProvider } from "@/components/providers/user-timezone-provider";

interface UserTimezoneProviderClientProps {
  userTimezone?: string | null;
  festivalTimezone?: string | null;
  children: React.ReactNode;
}

/**
 * Client-side wrapper for the `UserTimezoneProvider` so server components
 * can pass resolved `user.timezone` / `festival.timezone` from the request.
 */
export function UserTimezoneProviderClient({
  userTimezone,
  festivalTimezone,
  children,
}: UserTimezoneProviderClientProps) {
  return (
    <UserTimezoneProvider
      userTimezone={userTimezone}
      festivalTimezone={festivalTimezone}
    >
      {children}
    </UserTimezoneProvider>
  );
}
