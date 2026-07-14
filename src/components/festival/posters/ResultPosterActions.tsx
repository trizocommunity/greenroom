"use client";

import type Konva from "konva";
import { Download, Share2, Shuffle } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  exportStagePng,
  PosterExportCanvas,
} from "@/components/festival/posters/PosterExportCanvas";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResultPosterExportPayload } from "@/features/posters/actions/poster-export.actions";
import { buildResultPosterBindings } from "@/features/posters/services/poster-bindings.service";

export function ResultPosterActions({
  payload,
  festivalSlug,
  canSwap,
  publicMode = false,
}: {
  payload: ResultPosterExportPayload;
  festivalSlug: string;
  canSwap: boolean;
  publicMode?: boolean;
}) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const defaultCode =
    payload.defaultTemplateCode ??
    payload.publishedTemplateCodes[0] ??
    "RESULT-A";
  const [activeCode, setActiveCode] = useState(defaultCode);

  const template = useMemo(
    () =>
      payload.templates.find((t) => t.code === activeCode) ??
      payload.templates[0],
    [payload.templates, activeCode],
  );

  const bindings = useMemo(
    () => buildResultPosterBindings(payload.bindings),
    [payload.bindings],
  );

  const download = useCallback(() => {
    if (!template) return;
    exportStagePng(
      stageRef.current,
      `result-poster-${payload.programmeName.replace(/\s+/g, "-").toLowerCase()}-${activeCode}.png`,
    );
    toast.success("Poster downloaded");
  }, [activeCode, payload.programmeName, template]);

  const share = useCallback(async () => {
    const url = `${window.location.origin}/${festivalSlug}/results?programmeId=${payload.programmeId}&template=${activeCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
    download();
  }, [activeCode, download, festivalSlug, payload.programmeId]);

  if (!template) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <span className="text-xs font-medium text-muted-foreground">
        Result poster
      </span>
      {canSwap && payload.publishedTemplateCodes.length > 1 && (
        <Select value={activeCode} onValueChange={setActiveCode}>
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {payload.publishedTemplateCodes.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {!canSwap && (
        <span className="text-xs text-muted-foreground">{activeCode}</span>
      )}
      <Button type="button" size="sm" variant="outline" onClick={download}>
        <Download className="mr-1 h-3.5 w-3.5" />
        Download
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={share}>
        <Share2 className="mr-1 h-3.5 w-3.5" />
        Share
      </Button>
      {canSwap && !publicMode && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const idx = payload.publishedTemplateCodes.indexOf(activeCode);
            const next =
              payload.publishedTemplateCodes[
                (idx + 1) % payload.publishedTemplateCodes.length
              ];
            setActiveCode(next);
          }}
        >
          <Shuffle className="mr-1 h-3.5 w-3.5" />
          Swap
        </Button>
      )}
      <PosterExportCanvas
        doc={template.konvaJson}
        bindings={bindings}
        stageRef={stageRef}
      />
    </div>
  );
}
