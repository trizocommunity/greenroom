"use client";

import type Konva from "konva";
import { Download, Share2, Shuffle } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
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
  initialTemplateCode,
}: {
  payload: ResultPosterExportPayload;
  festivalSlug: string;
  canSwap: boolean;
  publicMode?: boolean;
  initialTemplateCode?: string;
}) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const firstCode = payload.publishedTemplateCodes[0] ?? "RESULT-A";
  const [activeCode, setActiveCode] = useState(
    initialTemplateCode ?? firstCode,
  );

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

  const posterFilename = useMemo(() => {
    const safeProgramme = payload.programmeName
      .replace(/\s+/g, "-")
      .toLowerCase();
    return `result-poster-${safeProgramme}-${activeCode}.png`;
  }, [payload.programmeName, activeCode]);

  const stageToBlob = useCallback(async (): Promise<Blob | null> => {
    const stage = stageRef.current;
    if (!stage) return null;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const res = await fetch(dataUrl);
    return res.blob();
  }, []);

  const download = useCallback(async () => {
    const blob = await stageToBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = posterFilename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Poster downloaded");
  }, [posterFilename, stageToBlob]);

  const copyShareLink = useCallback(async () => {
    const url = `${window.location.origin}/${festivalSlug}/results?programmeId=${payload.programmeId}&template=${activeCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, [activeCode, festivalSlug, payload.programmeId]);

  const share = useCallback(async () => {
    const blob = await stageToBlob();
    const url = `${window.location.origin}/${festivalSlug}/results?programmeId=${payload.programmeId}&template=${activeCode}`;
    const canNativeShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      blob instanceof Blob;
    try {
      if (canNativeShare) {
        const file = new File([blob], posterFilename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: payload.programmeName,
            text: `${payload.programmeName} — result poster`,
            url,
          });
          return;
        }
      }
      if (blob) await download();
      else copyShareLink();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      copyShareLink();
    }
  }, [
    activeCode,
    copyShareLink,
    download,
    festivalSlug,
    payload.programmeId,
    payload.programmeName,
    posterFilename,
    stageToBlob,
  ]);

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
      {!canSwap && payload.publishedTemplateCodes.length > 1 && (
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
      {canSwap && !publicMode && payload.publishedTemplateCodes.length > 1 && (
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
