import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";

const PREFIX = "greenroom-festival-editor-autosave:";

export function localBackupKey(festivalId: string, code: string) {
  return `${PREFIX}${festivalId}:${code}`;
}

export function writeLocalEditorBackup(
  festivalId: string,
  code: string,
  document: PosterEditorDocument,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      localBackupKey(festivalId, code),
      JSON.stringify({ document, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Quota or private mode — ignore
  }
}

export function readLocalEditorBackup(
  festivalId: string,
  code: string,
): { document: PosterEditorDocument; savedAt: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(localBackupKey(festivalId, code));
    if (!raw) return null;
    return JSON.parse(raw) as {
      document: PosterEditorDocument;
      savedAt: string;
    };
  } catch {
    return null;
  }
}

export function clearLocalEditorBackup(festivalId: string, code: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(localBackupKey(festivalId, code));
}
