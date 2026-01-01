"use client";

import { createContext, type ReactNode, useContext } from "react";

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
  eventsCount?: number;
  sessionsCount?: number;
  limits?: {
    maxStudents: number;
    maxProgrammes?: number;
    maxJudges?: number;
    maxSessions?: number;
    maxStorageMB?: number;
  } | null;
  // Deadlines
  studentCreationDeadline: string | Date | null;
  programmeAssignmentDeadline: string | Date | null;
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
