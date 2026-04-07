"use client";

import { FileDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ExpiredFestivalViewProps {
  festivalName: string;
  festivalSlug: string;
  hasPdf: boolean;
  downloadPdfUrl: string;
}

export function ExpiredFestivalView({
  festivalName,
  festivalSlug,
  hasPdf,
  downloadPdfUrl,
}: ExpiredFestivalViewProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-muted/30">
      <div className="max-w-md space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{festivalName}</h1>
        <p className="text-xl font-medium text-muted-foreground">
          This festival has ended.
        </p>
        <p className="text-muted-foreground">Thank you for participating.</p>
        <p className="text-muted-foreground">See you next year.</p>
        {hasPdf && (
          <Button variant="outline" className="gap-2" asChild>
            <Link
              href={downloadPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileDown className="h-4 w-4" />
              Download Results PDF
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
