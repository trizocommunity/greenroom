"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api-client";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<{
    email: string;
    festivalName: string;
    festivalRole: string;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const acceptInvitation = useCallback(() => {
    api.invitations
      .accept({ token })
      .then((res) => {
        if (res.body.success) {
          router.push(`/dashboard/${res.body.festivalSlug}`);
        } else {
          setError(res.body.error || "Failed to accept invitation");
        }
      })
      .catch(() => {
        setError("Failed to accept invitation");
      });
  }, [router, token]);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      return;
    }

    // Check if user is authenticated
    api.auth
      .v1Me()
      .then((res) => {
        setIsAuthenticated(res.status >= 200 && res.status < 300);
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, [token]);

  useEffect(() => {
    if (isAuthenticated === null) return;

    if (!token) {
      setError("Invalid invitation link");
      return;
    }

    // Fetch invitation details
    api.invitations
      .details(token)
      .then((res) => {
        if (!res.body.success) {
          setError(res.body.error || "Invalid invitation");
          return;
        }
        setInviteDetails({
          email: res.body.data.email,
          festivalName: res.body.data.festivalName,
          festivalRole: res.body.data.festivalRole,
        });

        if (res.body.data.alreadyAccepted) {
          setError("This invitation has already been used");
          return;
        }

        if (res.body.data.expired) {
          setError("This invitation has expired");
          return;
        }

        // If logged in, accept immediately
        if (isAuthenticated) {
          acceptInvitation();
        }
      })
      .catch(() => {
        setError("Failed to load invitation details");
      });
  }, [isAuthenticated, token, acceptInvitation]);

  if (isAuthenticated === null || (isAuthenticated && !inviteDetails)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-foreground">
            {error.includes("already")
              ? "Invitation Used"
              : error.includes("expired")
                ? "Invitation Expired"
                : "Invalid Invitation"}
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <a
            href="/profile"
            className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go to Profile
          </a>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-foreground">
            You&apos;ve been invited!
          </h1>
          {inviteDetails && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                You&apos;ve been invited to join{" "}
                <strong>{inviteDetails.festivalName}</strong> as{" "}
                <strong>{inviteDetails.festivalRole}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Sign in to accept this invitation
              </p>
            </div>
          )}
          <a
            href={`/login?email=${encodeURIComponent(inviteDetails?.email || "")}&redirect=/invite/${token}`}
            className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Sign In to Accept
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Accepting invitation...</p>
      </div>
    </div>
  );
}
