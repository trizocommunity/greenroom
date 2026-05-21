"use client";

import type { ReactNode } from "react";
import {
  ImageIcon,
  Layers3,
  LayoutGrid,
  LayoutTemplate,
  Type,
} from "lucide-react";
import type { EditorNavPanel } from "./poster-editor-config";
import { editorNavAside } from "./editor-chrome";
import { cn } from "@/core/utils/cn";

const NAV_ITEMS: {
  id: EditorNavPanel;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "templates",
    label: "Templates",
    icon: <LayoutTemplate className="h-4 w-4" />,
  },
  { id: "elements", label: "Elements", icon: <LayoutGrid className="h-4 w-4" /> },
  { id: "bg", label: "BG", icon: <ImageIcon className="h-4 w-4" /> },
  { id: "layers", label: "Layers", icon: <Layers3 className="h-4 w-4" /> },
  { id: "fonts", label: "Fonts", icon: <Type className="h-4 w-4" /> },
];

export function EditorNavRail({
  active,
  onChange,
  footer,
}: {
  active: EditorNavPanel;
  onChange: (panel: EditorNavPanel) => void;
  footer?: ReactNode;
}) {
  return (
    <nav className={editorNavAside}>
      <div className="mb-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">
        GR
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "flex w-full flex-col items-center gap-0.5 px-0.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-sidebar-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-colors xl:h-9 xl:w-9",
                isActive
                  ? "border-primary bg-primary/15 shadow-[0_0_8px_rgba(124,58,237,0.3)]"
                  : "border-transparent",
              )}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
      </div>
      {footer}
    </nav>
  );
}
