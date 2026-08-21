"use client";

import type { ConflictParts } from "./types";

export function ConflictAlert({
  parts,
  message,
}: {
  parts?: ConflictParts | null;
  message?: string | null;
}) {
  if (!parts && !message) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
    >
      <span className="shrink-0 size-3.5 rounded-full bg-destructive/20 flex items-center justify-center text-[9px] font-bold">
        !
      </span>
      <span>
        {parts ? (
          <>
            {parts.prefix}
            <strong className="font-semibold">{parts.highlight}</strong>
            {parts.suffix}
          </>
        ) : (
          message
        )}
      </span>
    </div>
  );
}
