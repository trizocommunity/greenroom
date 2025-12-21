"use client";

import { createContext, type ReactNode, useContext } from "react";

export type FestivalPublicData = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  tagline: string | null;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  accentColor: string;
  logo: string | null;
  heroImage: string | null;
  orgName: string;
  orgDescription: string | null;
  orgWebsite: string | null;
  orgLocation: string | null;
  orgEstablishedYear: number | null;
  activeEdition: {
    id: string;
    name: string;
    status: string; // EditionStatus
    participantsCount: number;
    limits: {
      maxParticipants: number;
    } | null;
  } | null;
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
