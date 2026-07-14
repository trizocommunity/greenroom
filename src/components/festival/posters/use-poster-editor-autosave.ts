"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import { writeLocalEditorBackup } from "@/components/festival/posters/festival-editor-local-backup";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const DEFAULT_DEBOUNCE_MS = 2000;

export function usePosterEditorAutosave({
  enabled,
  festivalId,
  templateCode,
  getDocument,
  isDirty,
  saveDraft,
  onSaved,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: {
  enabled: boolean;
  festivalId: string;
  templateCode: string;
  getDocument: () => PosterEditorDocument | null;
  isDirty: boolean;
  saveDraft: (doc: PosterEditorDocument) => Promise<boolean>;
  onSaved?: () => void;
  debounceMs?: number;
}) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingFlushRef = useRef(false);
  const latestDocRef = useRef<PosterEditorDocument | null>(null);

  const flush = useCallback(
    async (reason: "debounce" | "unload" | "manual" = "debounce") => {
      if (!enabled) return;
      const doc = latestDocRef.current ?? getDocument();
      if (!doc) return;

      writeLocalEditorBackup(festivalId, templateCode, doc);

      if (savingRef.current) {
        pendingFlushRef.current = true;
        return;
      }

      savingRef.current = true;
      setStatus("saving");
      setErrorMessage(null);

      try {
        const ok = await saveDraft(doc);
        if (ok) {
          setLastSavedAt(new Date().toISOString());
          setStatus("saved");
          onSaved?.();
        } else {
          setStatus("error");
          if (reason === "unload") {
            setErrorMessage(
              "Could not save before leaving — local backup kept.",
            );
          }
        }
      } catch {
        setStatus("error");
        setErrorMessage("Autosave failed — local backup kept.");
      } finally {
        savingRef.current = false;
        if (pendingFlushRef.current) {
          pendingFlushRef.current = false;
          void flush("debounce");
        }
      }
    },
    [enabled, festivalId, templateCode, getDocument, onSaved, saveDraft],
  );

  const schedule = useCallback(
    (doc: PosterEditorDocument) => {
      if (!enabled) return;
      latestDocRef.current = doc;
      writeLocalEditorBackup(festivalId, templateCode, doc);
      setStatus("dirty");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flush("debounce");
      }, debounceMs);
    },
    [debounceMs, enabled, festivalId, flush, templateCode],
  );

  useEffect(() => {
    if (!enabled || !isDirty) return;
    const doc = getDocument();
    if (doc) schedule(doc);
  }, [enabled, isDirty, getDocument, schedule]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden" && isDirty) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        void flush("unload");
      }
    };

    const onPageHide = () => {
      if (isDirty) void flush("unload");
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      void flush("unload");
      e.preventDefault();
      e.returnValue = "";
    };

    const onOnline = () => {
      if (isDirty) void flush("debounce");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", onOnline);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, flush, isDirty]);

  const saveNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const doc = getDocument();
    if (doc) latestDocRef.current = doc;
    return flush("manual");
  }, [flush, getDocument]);

  return { status, lastSavedAt, errorMessage, saveNow, schedule };
}
