"use client";

import dynamic from "next/dynamic";

const PosterEditorPlayground = dynamic(
  () => import("@/components/editor/PosterEditorPlayground"),
  {
    ssr: false,
    loading: () => (
      <div className="hidden min-h-dvh items-center justify-center text-sm text-muted-foreground lg:flex">
        Loading poster editor…
      </div>
    ),
  },
);

export function EditorPageClient() {
  return <PosterEditorPlayground />;
}
