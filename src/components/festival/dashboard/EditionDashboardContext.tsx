"use client";

import { createContext, useContext } from "react";

type EditionDashboardContextType = {
  festivalSlug: string;
  editionSlug: string;
  editionName: string;
};

export const EditionDashboardContext = createContext<
  EditionDashboardContextType | undefined
>(undefined);

export function useEditionDashboard() {
  const context = useContext(EditionDashboardContext);
  if (!context) {
    throw new Error(
      "useEditionDashboard must be used within an EditionDashboardContext",
    );
  }
  return context;
}

export function EditionDashboardProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: EditionDashboardContextType;
}) {
  return (
    <EditionDashboardContext.Provider value={value}>
      {children}
    </EditionDashboardContext.Provider>
  );
}
