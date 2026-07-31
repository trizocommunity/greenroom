"use client";

import * as React from "react";

import { DEFAULT_TZ } from "@/core/datetime";

interface UserTimezoneContextValue {
  /** The user's preferred IANA timezone, or null when unset. */
  userTimezone: string | null;
  /** The festival's IANA timezone (passed via dashboard loader), or null. */
  festivalTimezone: string | null;
  /**
   * The timezone to use for display: festival-timezone > user-timezone > browser default.
   * Surfaced as a single value so consumers don't need to repeat the priority.
   */
  displayTimezone: string;
}

const UserTimezoneContext = React.createContext<UserTimezoneContextValue>({
  userTimezone: null,
  festivalTimezone: null,
  displayTimezone: DEFAULT_TZ,
});

export interface UserTimezoneProviderProps {
  userTimezone?: string | null;
  festivalTimezone?: string | null;
  /** Override the computed display TZ. Useful for previewing other zones. */
  override?: string | null;
  children: React.ReactNode;
}

/**
 * Wrap the app at a layout boundary to expose the current user/festival
 * timezone to client components. See Phase 7 wiring.
 */
export function UserTimezoneProvider({
  userTimezone = null,
  festivalTimezone = null,
  override = null,
  children,
}: UserTimezoneProviderProps) {
  const value = React.useMemo<UserTimezoneContextValue>(() => {
    if (override) {
      return {
        userTimezone,
        festivalTimezone,
        displayTimezone: override,
      };
    }
    const displayTimezone = festivalTimezone ?? userTimezone ?? DEFAULT_TZ;
    return { userTimezone, festivalTimezone, displayTimezone };
  }, [userTimezone, festivalTimezone, override]);

  return (
    <UserTimezoneContext.Provider value={value}>
      {children}
    </UserTimezoneContext.Provider>
  );
}

/**
 * Read the resolved display timezone. Consumers should pass this to
 * `formatDate`, `formatTime`, `formatDateTime`, `dateKeyLocal`, etc.
 */
export function useDisplayTimezone(): string {
  return React.useContext(UserTimezoneContext).displayTimezone;
}

export function useUserTimezone(): string | null {
  return React.useContext(UserTimezoneContext).userTimezone;
}

export function useFestivalTimezone(): string | null {
  return React.useContext(UserTimezoneContext).festivalTimezone;
}
