import { TEMPLATE_TYPES } from "./poster-editor-config";
import type { PosterEditorDocument } from "./poster-editor-types";

export interface EditorDraftTab {
  id: string;
  label: string;
  doc: PosterEditorDocument;
  past: PosterEditorDocument[];
  future: PosterEditorDocument[];
  savedBaseline: string | null;
}

export function isTabDirty(tab: EditorDraftTab): boolean {
  const snapshot = JSON.stringify(tab.doc);
  if (!tab.savedBaseline) return true;
  return snapshot !== tab.savedBaseline;
}

export function defaultDraftTabLabel(doc: PosterEditorDocument): string {
  if (doc.templateName) return doc.templateName;
  const meta = TEMPLATE_TYPES.find((t) => t.type === doc.templateType);
  return meta ? `${meta.emoji} Draft` : "Draft";
}
