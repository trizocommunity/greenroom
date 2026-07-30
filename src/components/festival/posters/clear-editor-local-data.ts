/** Dev /editor playground templates (localStorage). */
export const DEV_EDITOR_STORAGE_KEY = "greenroom-poster-templates-v1";

/** Festival editor autosave backups (localStorage). */
export const FESTIVAL_EDITOR_AUTOSAVE_PREFIX =
  "greenroom-festival-editor-autosave:";

export function clearAllEditorLocalData(): string[] {
  if (typeof window === "undefined") return [];
  const removed: string[] = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key === DEV_EDITOR_STORAGE_KEY ||
      key.startsWith(FESTIVAL_EDITOR_AUTOSAVE_PREFIX)
    ) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  }
  return removed;
}

export function clearFestivalEditorLocalData(festivalId: string): string[] {
  if (typeof window === "undefined") return [];
  const prefix = `${FESTIVAL_EDITOR_AUTOSAVE_PREFIX}${festivalId}:`;
  const removed: string[] = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    localStorage.removeItem(key);
    removed.push(key);
  }
  return removed;
}
