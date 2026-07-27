/** Festival-scoped poster editor URL (not under /dashboard). */
export function festivalEditorPath(slug: string, code?: string) {
  const base = `/${slug}/editor`;
  if (!code) return base;
  return `${base}?code=${encodeURIComponent(code)}`;
}

export function festivalTemplatesPath(slug: string) {
  return `/dashboard/${slug}/templates`;
}
