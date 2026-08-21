"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type ParsedCsv,
  parseCsvPreview,
} from "@/features/exports/utils/parse-csv-preview";

interface Props {
  blobUrl: string;
}

export function CsvPreviewViewer({ blobUrl }: Props) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setParsed(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(blobUrl);
        if (!res.ok) {
          throw new Error(`Failed to load CSV (${res.status})`);
        }
        const text = await res.text();
        if (cancelled) return;
        setParsed(parseCsvPreview(text));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load CSV");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blobUrl]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!parsed) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading CSV…
      </div>
    );
  }
  if (parsed.columns.length === 0 && parsed.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        This CSV is empty.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_var(--border)]">
          <tr>
            {parsed.columns.map((c, i) => (
              <th
                key={i}
                className="text-left font-medium px-3 py-2 border-b whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsed.rows.map((row, ri) => (
            <tr
              key={ri}
              className="odd:bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {parsed.columns.map((_, ci) => (
                <td
                  key={ci}
                  className="px-3 py-1.5 border-b border-border/50 align-top whitespace-nowrap"
                >
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
