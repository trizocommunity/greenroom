"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/cn";
import { editorSelectionSectionLabel } from "./editor-chrome";

export function EditorSelectionSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-1.5", className)}>
      <h3 className={editorSelectionSectionLabel}>{title}</h3>
      {children}
    </section>
  );
}
