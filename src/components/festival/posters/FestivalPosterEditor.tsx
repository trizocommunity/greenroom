"use client";

import { Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { PosterEditorAutosaveConfig } from "@/components/editor/PosterEditorPlayground";
import type { PosterTemplateType } from "@/components/editor/poster-editor-config";
import { TEMPLATE_TYPES } from "@/components/editor/poster-editor-config";
import { createPresetDocument } from "@/components/editor/poster-editor-presets";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import { openTemplateBackgroundPicker } from "@/components/editor/template-background-picker";
import {
  clearLocalEditorBackup,
  readLocalEditorBackup,
} from "@/components/festival/posters/festival-editor-local-backup";
import { Button } from "@/components/ui/button";
import {
  getEditorPreviewBindingsAction,
  getPosterTemplateAction,
  publishPosterTemplateAction,
  savePosterTemplateDraftAction,
} from "@/features/posters/actions/poster-template.actions";
import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";
import type { PosterTemplateStatus } from "@/features/posters/types/poster-template.types";
import { festivalTemplatesPath } from "@/features/posters/utils/poster-routes";
import {
  defaultCodeForType,
  templateTypeFromCode,
} from "@/features/posters/utils/template-code";

const PosterEditorPlayground = dynamic(
  () =>
    import("@/components/editor/PosterEditorPlayground").then((m) => m.default),
  { ssr: false, loading: () => <div className="p-8">Loading editor…</div> },
);

// ─── Type-selector screen shown when no ?code= param is present ───────────────

function TemplatePicker({
  onPick,
}: {
  onPick: (
    type: PosterTemplateType,
    mode: "blank" | "background",
    backgroundImageUrl?: string,
  ) => void;
}) {
  const pickWithBackground = (type: PosterTemplateType) => {
    openTemplateBackgroundPicker((url) => {
      onPick(type, "background", url);
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Start a new template
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose the poster type to get started. You can customise everything
            in the editor.
          </p>
        </div>

        {/* Template type cards */}
        <div className="space-y-3">
          {TEMPLATE_TYPES.map((t) => (
            <div
              key={t.type}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="p-5">
                <p className="text-base font-semibold text-foreground">
                  {t.emoji}&ensp;{t.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {t.width} × {t.height} px
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onPick(t.type, "blank")}>
                    + Blank
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => pickWithBackground(t.type)}
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    With background image
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main festival poster editor ─────────────────────────────────────────────

export function FestivalPosterEditor({
  festivalId,
  festivalSlug,
  festivalName,
}: {
  festivalId: string;
  festivalSlug: string;
  festivalName: string;
}) {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");

  const [initialDoc, setInitialDoc] = useState<PosterEditorDocument | null>(
    null,
  );
  const [templateCode, setTemplateCode] = useState(codeParam ?? "");
  const [templateStatus, setTemplateStatus] =
    useState<PosterTemplateStatus | null>(null);

  /**
   * Show the full-screen type picker when no ?code= param is provided,
   * so users never land on a silent blank preset.
   */
  const [showTypePicker, setShowTypePicker] = useState(!codeParam);

  const [pending, startTransition] = useTransition();
  const [publishing, setPublishing] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [previewBindings, setPreviewBindings] = useState<PosterBindings | null>(
    null,
  );
  const [previewDataHint, setPreviewDataHint] = useState<string | null>(null);

  // Load template from DB (only when we have a code)
  useEffect(() => {
    const code = codeParam ?? "";
    if (!code) return; // wait until user picks a type or a code param is present

    setTemplateCode(code);
    setShowTypePicker(false);

    startTransition(async () => {
      const res = await getPosterTemplateAction(festivalId, code);

      if (res.success && res.data) {
        setInitialDoc(res.data.konvaJson);
        setTemplateStatus(res.data.status);
        setRecoveryNotice(null);
        return;
      }

      // No DB record — try local backup, then fall back to blank preset
      const backup = readLocalEditorBackup(festivalId, code);
      const type =
        templateTypeFromCode(code) ?? ("RESULT" as PosterTemplateType);
      const preset = createPresetDocument(type, {});
      setTemplateStatus(null);

      if (backup?.document) {
        setInitialDoc(backup.document);
        setRecoveryNotice(
          `Restored local backup from ${new Date(backup.savedAt).toLocaleString()}.`,
        );
      } else {
        setInitialDoc(preset);
        setRecoveryNotice(null);
      }
    });
  }, [codeParam, festivalId]);

  const refreshPreviewBindings = useCallback(async () => {
    if (!templateCode) return;
    const type =
      templateTypeFromCode(templateCode) ?? ("RESULT" as PosterTemplateType);
    const res = await getEditorPreviewBindingsAction(festivalId, type);
    if (res.success) {
      setPreviewBindings(res.data.bindings);
      setPreviewDataHint(res.data.hint);
    }
  }, [festivalId, templateCode]);

  useEffect(() => {
    void refreshPreviewBindings();
  }, [refreshPreviewBindings]);

  const saveDraftSilent = useCallback(
    async (doc: PosterEditorDocument): Promise<boolean> => {
      const res = await savePosterTemplateDraftAction(
        {
          festivalId,
          code: templateCode,
          document: doc,
        },
        festivalSlug,
      );
      if (res.success) {
        clearLocalEditorBackup(festivalId, templateCode);
        return true;
      }
      return false;
    },
    [festivalId, festivalSlug, templateCode],
  );

  const saveDraftManual = useCallback(
    (doc: PosterEditorDocument) => {
      startTransition(async () => {
        const ok = await saveDraftSilent(doc);
        if (ok) toast.success(`Draft saved (${templateCode})`);
        else toast.error("Could not save draft");
      });
    },
    [saveDraftSilent, templateCode],
  );

  /** Called when user picks a type from the TemplatePicker screen */
  const handleTypePick = useCallback(
    (
      type: PosterTemplateType,
      mode: "blank" | "background",
      backgroundImageUrl?: string,
    ) => {
      const code = defaultCodeForType(type);
      const preset = createPresetDocument(type, {
        withBackground: mode === "background" ? true : undefined,
        backgroundImageUrl,
      });
      setTemplateCode(code);
      setInitialDoc(preset);
      setTemplateStatus(null);
      setShowTypePicker(false);
      setRecoveryNotice(null);
    },
    [],
  );

  const autosave: PosterEditorAutosaveConfig = {
    festivalId,
    templateCode,
    saveDraft: saveDraftSilent,
    debounceMs: 2000,
  };

  const confirmPublish = useCallback(
    async (doc: PosterEditorDocument): Promise<boolean> => {
      setPublishing(true);
      try {
        const saved = await saveDraftSilent(doc);
        if (!saved) {
          toast.error("Could not save draft — fix errors and try again");
          return false;
        }
        const res = await publishPosterTemplateAction(
          festivalId,
          templateCode,
          festivalSlug,
        );
        if (res.success) {
          toast.success(`Published ${templateCode}`);
          clearLocalEditorBackup(festivalId, templateCode);
          setTemplateStatus("PUBLISHED");
          return true;
        }
        toast.error(res.error);
        return false;
      } finally {
        setPublishing(false);
      }
    },
    [festivalId, festivalSlug, saveDraftSilent, templateCode],
  );

  // ── Render: type picker ──────────────────────────────────────────────────
  if (showTypePicker) {
    return <TemplatePicker onPick={handleTypePick} />;
  }

  // ── Render: loading ──────────────────────────────────────────────────────
  if (!initialDoc) {
    return (
      <div className="flex h-dvh items-center justify-center">Loading…</div>
    );
  }

  // ── Render: editor ───────────────────────────────────────────────────────
  //
  // When editing a PUBLISHED template, rename the autosave "Save now" button
  // to "Save changes" so it's clear the update persists to the live record.
  // (savePosterTemplateDraftAction preserves the existing PUBLISHED status.)
  const saveNowLabel =
    templateStatus === "PUBLISHED" ? "Save changes" : undefined;

  return (
    <div className="flex h-dvh flex-col">
      {recoveryNotice && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          {recoveryNotice}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <PosterEditorPlayground
          initialDocument={initialDoc}
          templateCode={templateCode}
          onSaveDraft={saveDraftManual}
          autosave={autosave}
          previewBindings={previewBindings}
          previewDataHint={previewDataHint}
          publishTemplate={{
            templateCode,
            pending: publishing,
            onConfirmPublish: confirmPublish,
          }}
          sidebarBrandHref={festivalTemplatesPath(festivalSlug)}
          sidebarBrandLabel={festivalName}
          resetTemplate={{
            templateCode,
            onAfterReset: async () => {
              clearLocalEditorBackup(festivalId, templateCode);
              await refreshPreviewBindings();
            },
          }}
          saveNowLabel={saveNowLabel}
        />
      </div>
    </div>
  );
}
