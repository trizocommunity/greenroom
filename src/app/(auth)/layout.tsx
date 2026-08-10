"use client";

import { Loader2 } from "lucide-react";
import { Suspense } from "react";

function AuthSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <div className="min-h-screen bg-background flex items-center justify-center">
        {children}
      </div>
    </Suspense>
  );
}
