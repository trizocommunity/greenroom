import type { PosterTemplateType } from "./poster-editor-config";
import { cloneDoc } from "./editor-utils";
import type { PosterEditorDocument } from "./poster-editor-types";

const STORAGE_KEY = "greenroom-poster-templates-v1";

export interface SavedPosterTemplate {
  id: string;
  name: string;
  type: PosterTemplateType;
  document: PosterEditorDocument;
  savedAt: string;
  updatedAt: string;
}

export function listSavedTemplates(): SavedPosterTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPosterTemplate[];
  } catch {
    return [];
  }
}

export function listSavedTemplatesByType(
  type: PosterTemplateType,
): SavedPosterTemplate[] {
  return listSavedTemplates()
    .filter((t) => t.type === type)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

function writeAll(templates: SavedPosterTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function savePosterTemplate(
  name: string,
  document: PosterEditorDocument,
  existingId?: string | null,
): SavedPosterTemplate {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Template name is required");

  const now = new Date().toISOString();
  const all = listSavedTemplates();
  const docSnapshot = cloneDoc({
    ...document,
    templateName: trimmed,
    savedTemplateId: existingId ?? undefined,
    updatedAt: now,
  });

  if (existingId) {
    const idx = all.findIndex((t) => t.id === existingId);
    if (idx >= 0) {
      const updated: SavedPosterTemplate = {
        ...all[idx],
        name: trimmed,
        type: document.templateType,
        document: { ...docSnapshot, savedTemplateId: existingId },
        updatedAt: now,
      };
      all[idx] = updated;
      writeAll(all);
      return updated;
    }
  }

  const id = existingId ?? crypto.randomUUID();
  const created: SavedPosterTemplate = {
    id,
    name: trimmed,
    type: document.templateType,
    document: { ...docSnapshot, savedTemplateId: id, templateName: trimmed },
    savedAt: now,
    updatedAt: now,
  };
  writeAll([created, ...all]);
  return created;
}

export function deleteSavedTemplate(id: string) {
  writeAll(listSavedTemplates().filter((t) => t.id !== id));
}

export function getSavedTemplate(id: string): SavedPosterTemplate | null {
  return listSavedTemplates().find((t) => t.id === id) ?? null;
}
