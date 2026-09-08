"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useCloudinaryUpload } from "@/api/client/upload";
import { sanitizeDocumentForSave } from "@/components/editor/editor-utils";
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
  unpublishPosterTemplateAction,
  savePosterTemplateDraftAction,
} from "@/features/posters/actions/poster-template.actions";
import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";
import type { PosterTemplateStatus } from "@/features/posters/types/poster-template.types";
import {
  festivalEditorPath,
  festivalTemplatesPath,
} from "@/features/posters/utils/poster-routes";
import {
  defaultCodeForType,
  suggestNextTemplateCode,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");

  const [initialDoc, setInitialDoc] = useState<PosterEditorDocument | null>(
    null,
  );
  const [templateCode, setTemplateCode] = useState(codeParam ?? "");
  const [templateStatus, setTemplateStatus] =
    useState<PosterTemplateStatus | null>(null);

  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);

  const uploadMutation = useCloudinaryUpload();

  const uploadImage = useCallback(
    async (file: File) => {
      const result = await uploadMutation.mutateAsync({
        file,
        folder: "templates",
        festivalId,
      });
      return result.url;
    },
    [uploadMutation, festivalId],
  );
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
    if (!codeParam) {
      setTemplateCode("");
      setInitialDoc(null);
      setTemplateStatus(null);
      setReady(true);
      return;
    }

    const code = codeParam;
    setTemplateCode(code);

    startTransition(async () => {
      const res = await getPosterTemplateAction(festivalId, code);

      if (res.success && res.data) {
        setInitialDoc(res.data.konvaJson);
        setTemplateStatus(res.data.status);
        setRecoveryNotice(null);
        setReady(true);
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
      setReady(true);
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
      if (!templateCode) return false;
      // Strip blob: URLs so we never persist them to the database.
      const { doc: safeDoc } = sanitizeDocumentForSave(doc);
      const res = await savePosterTemplateDraftAction(
        {
          festivalId,
          code: templateCode,
          document: safeDoc,
          meta: safeDoc.templateName
            ? { name: safeDoc.templateName }
            : undefined,
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

  const handleCreateTemplate = useCallback(
    (
      type: PosterTemplateType,
      options?: {
        backgroundImageUrl?: string;
        width?: number;
        height?: number;
      },
    ) => {
      const existingCodes = dbTemplates.map((t) => t.code);
      const nextCode = suggestNextTemplateCode(type, existingCodes);
      const preset = createPresetDocument(type, options ?? {});
      setTemplateCode(nextCode);
      setInitialDoc(preset);
      setTemplateStatus("DRAFT");
      router.replace(festivalEditorPath(festivalSlug, nextCode));
    },
    [dbTemplates, festivalSlug, router],
  );

  const handleRenameTemplate = useCallback(
    async (newLabel: string, doc?: PosterEditorDocument) => {
      if (!templateCode) return;
      const targetDoc = doc ?? initialDoc;
      if (!targetDoc) return;

      const updatedDoc: PosterEditorDocument = {
        ...targetDoc,
        templateName: newLabel,
        updatedAt: new Date().toISOString(),
      };

      setInitialDoc(updatedDoc);

      const res = await savePosterTemplateDraftAction(
        {
          festivalId,
          code: templateCode,
          document: updatedDoc,
          meta: { name: newLabel },
        },
        festivalSlug,
      );

      if (res.success) {
        toast.success(`Template renamed to "${newLabel}"`);
        const listRes = await listPosterTemplatesAction(festivalId);
        if (listRes.success) {
          setDbTemplates(listRes.data);
        }
      } else {
        toast.error(res.error ?? "Failed to save template name");
      }
    },
    [festivalId, festivalSlug, initialDoc, templateCode],
  );

  const autosave: PosterEditorAutosaveConfig | undefined = templateCode
    ? {
        festivalId,
        templateCode,
        saveDraft: saveDraftSilent,
        debounceMs: 2000,
      }
    : undefined;

  const confirmPublish = useCallback(
    async (doc: PosterEditorDocument): Promise<boolean> => {
      if (!templateCode) return false;
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

  const confirmUnpublish = useCallback(async (): Promise<boolean> => {
    if (!templateCode) return false;
    setPublishing(true);
    try {
      const res = await unpublishPosterTemplateAction(
        festivalId,
        templateCode,
        festivalSlug,
      );
      if (res.success) {
        toast.success(`Unpublished ${templateCode}`);
        setTemplateStatus("DRAFT");
        return true;
      }
      toast.error(res.error);
      return false;
    } finally {
      setPublishing(false);
    }
  }, [festivalId, festivalSlug, templateCode]);

  // ── Render: loading ──────────────────────────────────────────────────────
  if (!ready) {
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

  const initialTabLabel =
    initialDoc?.templateName || (templateCode ? templateCode : undefined);

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
          initialTabLabel={initialTabLabel}
          templateCode={templateCode}
          onSaveDraft={templateCode ? saveDraftManual : undefined}
          autosave={autosave}
          previewBindings={previewBindings}
          previewDataHint={previewDataHint}
          publishTemplate={
            templateCode
              ? {
                  templateCode,
                  pending: publishing,
                  isPublished: templateStatus === "PUBLISHED",
                  onConfirmPublish: confirmPublish,
                  onConfirmUnpublish: confirmUnpublish,
                }
              : undefined
          }
          dbTemplates={dbTemplates}
          sidebarBrandHref={festivalTemplatesPath(festivalSlug)}
          sidebarBrandLabel={festivalName}
          resetTemplate={
            templateCode
              ? {
                  templateCode,
                  onAfterReset: async () => {
                    clearLocalEditorBackup(festivalId, templateCode);
                    await refreshPreviewBindings();
                  },
                }
              : undefined
          }
          saveNowLabel={saveNowLabel}
          uploadImage={uploadImage}
          onCreateTemplate={handleCreateTemplate}
          onRenameTemplate={handleRenameTemplate}
        />
      </div>
    </div>
  );
}
