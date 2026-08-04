"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { FeaturePath } from "@/features/plan-features/services/features";

export type FestivalPublicData = {
  id: string;
  name: string;
  slug: string | null; // Made nullable in type, but usually present
  description: string | null;
  tagline: string | null;
  startDate: string | null; // Dates might be optional now
  endDate: string | null;
  location: string | null;
  status: string;
  tier: string;
  logo: string | null;
  orgName: string | null;
  orgDescription: string | null;
  orgWebsite: string | null;
  orgLocation: string | null;
  establishedYear: number | null;
  // Festival stats
  participantsCount?: number;
  programmesCount?: number;
  stagesCount?: number;
  limits?: {
    maxParticipants: number;
    maxProgrammes?: number;
    maxStages?: number;
    maxStorageMB?: number;
  } | null;
  // Deadline windows (start = when team leaders may begin, deadline = when they're locked out)
  participantCreationStartDate?: string | Date | null;
  participantCreationDeadline: string | Date | null;
  programmeAssignmentStartDate?: string | Date | null;
  programmeAssignmentDeadline: string | Date | null;
  /** Admin overrides for plan features (from Super Admin). When set, useFeature uses these instead of config. */
  effectiveFeatures?: Partial<Record<FeaturePath, boolean>>;
};

const FestivalContext = createContext<FestivalPublicData | null>(null);

export function FestivalProvider({
  festival,
  children,
}: {
  festival: FestivalPublicData;
  children: ReactNode;
}) {
  return (
    <FestivalContext.Provider value={festival}>
      {children}
    </FestivalContext.Provider>
  );
}

export function useFestival() {
  const context = useContext(FestivalContext);
  if (!context) {
    throw new Error("useFestival must be used within a FestivalProvider");
  }
  return context;
}
