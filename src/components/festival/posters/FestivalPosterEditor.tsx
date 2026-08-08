"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { PosterEditorAutosaveConfig } from "@/components/editor/PosterEditorPlayground";
import type { PosterTemplateType } from "@/components/editor/poster-editor-config";
import { createPresetDocument } from "@/components/editor/poster-editor-presets";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import {
  clearLocalEditorBackup,
  readLocalEditorBackup,
} from "@/components/festival/posters/festival-editor-local-backup";
import {
  getEditorPreviewBindingsAction,
  getPosterTemplateAction,
  listPosterTemplatesAction,
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
import { toast } from "@/lib/toast";

const PosterEditorPlayground = dynamic(
  () =>
    import("@/components/editor/PosterEditorPlayground").then((m) => m.default),
  { ssr: false, loading: () => <div className="p-8">Loading editor…</div> },
);

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

  const [pending, startTransition] = useTransition();
  const [publishing, setPublishing] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [previewBindings, setPreviewBindings] = useState<PosterBindings | null>(
    null,
  );
  const [previewDataHint, setPreviewDataHint] = useState<string | null>(null);

  const [dbTemplates, setDbTemplates] = useState<any[]>([]);

  useEffect(() => {
    startTransition(async () => {
      const res = await listPosterTemplatesAction(festivalId);
      if (res.success) {
        setDbTemplates(res.data);
      }
    });
  }, [festivalId]);

  // Load template from DB
  useEffect(() => {
    const code = codeParam || defaultCodeForType("RESULT");

    setTemplateCode(code);

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
          dbTemplates={dbTemplates}
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
