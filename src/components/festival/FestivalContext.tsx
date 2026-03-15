"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { FeaturePath } from "@/lib/features";

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
  accentColor: string;
  logo: string | null;
  heroImage: string | null;
  orgName: string | null;
  orgDescription: string | null;
  orgWebsite: string | null;
  orgLocation: string | null;
  establishedYear: number | null;
  // Festival stats
  studentsCount?: number;
  programmesCount?: number;
  stagesCount?: number;
  limits?: {
    maxStudents: number;
    maxProgrammes?: number;
    maxStages?: number;
    maxStorageMB?: number;
  } | null;
  // Deadlines
  studentCreationDeadline: string | Date | null;
  programmeAssignmentDeadline: string | Date | null;
  /** Admin overrides for plan features (from Super Admin). When set, useFeature uses these instead of config. */
  effectiveFeatures?: Partial<Record<FeaturePath, boolean>>;
  /** Festival is past expiry but within readonly retention window (e.g. STANDARD 30 days). Disable write actions. */
  readOnlyExpired?: boolean;
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
