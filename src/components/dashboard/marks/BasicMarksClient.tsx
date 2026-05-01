"use client";

import { ResultsManagementClient } from "@/components/dashboard/results/ResultsManagementClient";

export function BasicMarksClient({
  festival,
  programmes,
  categories,
  children,
}: {
  festival: any;
  programmes: any[];
  categories: any[];
  children?: React.ReactNode;
}) {
  return (
    <ResultsManagementClient
      festival={festival}
      programmes={programmes}
      categories={categories}
    >
      {children}
    </ResultsManagementClient>
  );
}
