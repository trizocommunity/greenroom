"use client";

import { Check, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";
import {
  documentFontsFromElements,
  filterFonts,
  FONT_CATEGORY_LABELS,
  type EditorFontEntry,
  type FontCategory,
} from "./editor-font-catalog";
import type { PosterEditorState } from "./use-poster-editor-state";

const STYLE_CHIPS: { id: FontCategory | "all"; sampleClass?: string }[] = [
  { id: "trending" },
  { id: "display", sampleClass: "font-black tracking-tight" },
  { id: "sans" },
  { id: "serif", sampleClass: "font-serif italic" },
  { id: "script", sampleClass: "italic" },
  { id: "unique", sampleClass: "font-bold uppercase tracking-widest" },
  { id: "popular" },
  { id: "all" },
];

function FontRow({
  font,
  active,
  onSelect,
}: {
  font: EditorFontEntry;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
        active
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-muted/60",
      )}
      onClick={onSelect}
    >
      <span
        className="min-w-0 flex-1 truncate text-sm leading-tight text-foreground"
        style={{ fontFamily: font.family }}
      >
        {font.label}
      </span>
      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

export function EditorFontsPanel({ editor }: { editor: PosterEditorState }) {
  const { doc, selectedElement, updateElement, addCustomFont } = editor;
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("trending");

  const documentFonts = useMemo(
    () => (doc ? documentFontsFromElements(doc.elements) : []),
    [doc?.elements],
  );

  const filtered = useMemo(
    () => filterFonts(query, category),
    [query, category],
  );

  const activeFamily =
    selectedElement?.type === "text"
      ? selectedElement.fontFamily
      : undefined;

  const applyFont = (font: EditorFontEntry) => {
    if (!selectedElement || selectedElement.type !== "text") {
      toast.message("Select a text layer first");
      return;
    }
    updateElement(selectedElement.id, { fontFamily: font.family });
  };

  const customFonts = doc?.customFonts ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "Script" or "Display"'
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        {STYLE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
              category === chip.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50",
              chip.sampleClass,
            )}
            style={
              chip.id === "display"
                ? { fontFamily: '"Bebas Neue", sans-serif' }
                : chip.id === "script"
                  ? { fontFamily: '"Dancing Script", cursive' }
                  : chip.id === "unique"
                    ? { fontFamily: '"Orbitron", sans-serif' }
                    : undefined
            }
            onClick={() => setCategory(chip.id)}
          >
            {chip.id === "all" ? "All" : FONT_CATEGORY_LABELS[chip.id]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto [scrollbar-width:thin]">
        {documentFonts.length > 0 && (
          <section>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Document fonts
            </p>
            <div className="space-y-0.5">
              {documentFonts.map((font) => (
                <FontRow
                  key={font.id + font.family}
                  font={font}
                  active={activeFamily === font.family}
                  onSelect={() => applyFont(font)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {category === "all" ? "All fonts" : FONT_CATEGORY_LABELS[category]}
            <span className="ml-1 font-normal text-muted-foreground">
              ({filtered.length})
            </span>
          </p>
          <div className="space-y-0.5">
            {filtered.map((font) => (
              <FontRow
                key={font.id}
                font={font}
                active={activeFamily === font.family}
                onSelect={() => applyFont(font)}
              />
            ))}
          </div>
        </section>

        {customFonts.length > 0 && (
          <section>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Uploaded fonts
            </p>
            <div className="space-y-0.5">
              {customFonts.map((font) => (
                <FontRow
                  key={font.id}
                  font={{
                    id: font.id,
                    label: font.name,
                    family: font.name,
                    googleFamily: "",
                    categories: ["popular"],
                    tags: ["upload"],
                  }}
                  active={activeFamily === font.name}
                  onSelect={() => {
                    if (selectedElement?.type === "text") {
                      updateElement(selectedElement.id, {
                        fontFamily: font.name,
                      });
                    } else {
                      toast.message("Select a text layer first");
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="shrink-0 border-t border-border pt-2">
        <input
          ref={fontInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const name = f.name.replace(/\.[^.]+$/, "");
              const fontFace = new FontFace(name, await f.arrayBuffer());
              await fontFace.load();
              document.fonts.add(fontFace);
              addCustomFont(f);
              toast.success(`Font “${name}” loaded`);
            } catch {
              toast.error("Could not load font");
            }
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full text-xs"
          onClick={() => fontInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload custom font
        </Button>
      </div>
    </div>
  );
}
