"use client";

import { Download, Languages, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { editorBtnIcon, editorBtnSm, editorInput } from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorHeaderActions({
  editor,
  onExport,
}: {
  editor: PosterEditorState;
  onExport: () => void;
}) {
  const {
    doc,
    previewMode,
    setPreviewMode,
    resetDocument,
    setSaveModalOpen,
  } = editor;

  if (!doc) return null;

  return (
    <>
      <div className="hidden items-center gap-1.5 2xl:flex">
        <Switch
          id="preview-data"
          checked={previewMode}
          onCheckedChange={setPreviewMode}
          className="scale-90"
        />
        <Label
          htmlFor="preview-data"
          className="text-[11px] text-muted-foreground"
        >
          Preview data
        </Label>
      </div>

      <Select defaultValue="en">
        <SelectTrigger className={`${editorInput} hidden w-24 xl:flex`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ml">Malayalam</SelectItem>
        </SelectContent>
      </Select>

      <div className="hidden items-center gap-1 lg:flex">
        <Button
          variant="outline"
          size="sm"
          className={`${editorBtnSm} hidden xl:inline-flex`}
          disabled
        >
          <Languages className="h-3.5 w-3.5" />
          Auto-Translate
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={editorBtnIcon}
          title="Export PNG"
          onClick={onExport}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={editorBtnSm}
          title="Reset template to defaults"
          onClick={resetDocument}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button
          size="sm"
          className={editorBtnSm}
          onClick={() => setSaveModalOpen(true)}
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Save</span>
        </Button>
      </div>
    </>
  );
}
