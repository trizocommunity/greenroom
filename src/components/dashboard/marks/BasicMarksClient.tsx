"use client";

import { BasicScoringClient } from "@/components/dashboard/scoring/BasicScoringClient";

export function BasicMarksClient({
  festival,
  programmes,
  categories: _categories,
  children,
}: {
  festival: { id: string; slug: string; name: string };
  programmes: any[];
  categories: any[];
  children?: React.ReactNode;
}) {
  return (
    <BasicScoringClient festival={festival} programmes={programmes}>
      {children}
    </BasicScoringClient>
  );
}
