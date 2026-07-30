"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useVerifyMagicLink } from "@/features/auth/hooks/use-auth";

export default function MagicLinkTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const verifyMagicLink = useVerifyMagicLink();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid link");
      return;
    }

    verifyMagicLink.mutate(
      { token },
      {
        onSuccess: () => {
          // Navigation handled by the hook
        },
        onError: (err: any) => {
          setError(
            err?.body?.error?.message ||
              err?.body?.error ||
              "Invalid or expired link",
          );
        },
      },
    );
  }, [token, verifyMagicLink.mutate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Link Expired</h1>
          <p className="text-muted-foreground">{error}</p>
          <a
            href="/login"
            className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Request New Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
