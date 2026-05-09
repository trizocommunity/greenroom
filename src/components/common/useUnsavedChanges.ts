"use client";

import { useContext } from "react";
import { UnsavedChangesContext } from "@/components/common/UnsavedChangesProvider";

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error("useUnsavedChanges must be used inside UnsavedChangesProvider");
  }
  return context;
}
