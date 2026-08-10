"use client";

import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { editorBtnIcon } from "./editor-chrome";

export function EditorSidebarToggle({
  onClick,
  title = "Show sidebar",
}: {
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={editorBtnIcon}
      title={title}
      onClick={onClick}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}
