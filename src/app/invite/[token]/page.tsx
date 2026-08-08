"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  Mail,
  Ticket,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/core/auth/better-auth/client";
import { api } from "@/lib/api-client";

type InviteDetails = {
  email: string;
  festivalName: string;
  festivalRole: string;
};

type ErrorKind = "expired" | "used" | "invalid";

function classifyError(message: string): ErrorKind {
  const m = message.toLowerCase();
  if (m.includes("expired")) return "expired";
  if (m.includes("already")) return "used";
  return "invalid";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function festivalInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "F"
  );
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(
    null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const acceptInvitation = useCallback(() => {
    setIsAccepting(true);
    setError(null);
    api.invitations
      .accept({ token })
      .then((res) => {
        if (res.body.success) {
          router.push(
            res.body.requiresOnboarding
              ? "/onboarding"
              : `/dashboard/${res.body.festivalSlug}`,
          );
        } else {
          setIsAccepting(false);
          setError(res.body.error || "Failed to accept invitation");
        }
      })
      .catch(() => {
        setIsAccepting(false);
        setError("Failed to accept invitation");
      });
  }, [router, token]);

  // Step 1: figure out who (if anyone) is signed in.
  const { data: betterSession, isPending: sessionLoading } = useSession();

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      return;
    }
    if (sessionLoading) return;
    setIsAuthenticated(!!betterSession?.user);
    setSignedInEmail(betterSession?.user?.email ?? null);
  }, [betterSession, sessionLoading, token]);

  // Step 2: load the invitation itself.
  useEffect(() => {
    if (isAuthenticated === null || !token) return;
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
        }
      })
      .catch(() => {
        setError("Failed to load invitation details");
      });
  }, [isAuthenticated, token]);

  const handleUseInvitedEmail = useCallback(async () => {
    setSwitchingAccount(true);
    try {
      await signOut();
    } catch {
      // Even if logout fails we let them retry from the login page.
    }
    setSignedInEmail(null);
    setIsAuthenticated(false);
    setSwitchingAccount(false);
  }, []);

  // --- Loading -------------------------------------------------------------
  if (isAuthenticated === null || (!inviteDetails && !error)) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading your invitation…
          </p>
        </div>
      </Shell>
    );
  }

  // --- Error states --------------------------------------------------------
  if (error) {
    const kind = classifyError(error);
    const copy = {
      expired: {
        icon: Clock,
        tone: "text-amber-500 bg-amber-500/10",
        title: "This invitation has expired",
        body: inviteDetails
          ? `Your invite to ${inviteDetails.festivalName} is no longer valid. Ask an organiser to send you a fresh one.`
          : "This invite is no longer valid. Ask an organiser to send you a fresh one.",
      },
      used: {
        icon: CheckCircle2,
        tone: "text-emerald-500 bg-emerald-500/10",
        title: "This invitation was already used",
        body: "Looks like this invite has already been accepted. If that was you, head to your dashboard.",
      },
      invalid: {
        icon: XCircle,
        tone: "text-destructive bg-destructive/10",
        title: "This invitation link isn't valid",
        body: "The link may be broken or incomplete. Double-check it, or ask the organiser to resend your invitation.",
      },
    }[kind];
    const Icon = copy.icon;

    return (
      <Shell>
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${copy.tone}`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-foreground">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {copy.body}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() =>
                router.push(isAuthenticated ? "/profile" : "/login")
              }
              className="rounded-xl font-medium"
            >
              {isAuthenticated ? "Go to your dashboard" : "Go to sign in"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // --- Accepting (in-flight) ----------------------------------------------
  if (isAccepting) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Adding you to {inviteDetails?.festivalName ?? "the festival"}…
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hang tight, this only takes a second.
          </p>
        </div>
      </Shell>
    );
  }

  if (!inviteDetails) return null;

  const emailMismatch =
    isAuthenticated &&
    signedInEmail !== null &&
    signedInEmail.toLowerCase() !== inviteDetails.email.toLowerCase();

  // --- The invitation card -------------------------------------------------
  return (
    <Shell>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {/* Header banner */}
        <div className="flex flex-col items-center gap-3 border-b border-border/60 bg-muted/30 px-8 pb-6 pt-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Ticket className="h-3.5 w-3.5" />
            You&apos;re invited
          </span>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 text-lg font-bold text-primary">
            {festivalInitials(inviteDetails.festivalName)}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {inviteDetails.festivalName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              wants you to join their team
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 px-8 py-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">Your role</span>
            <FestivalRoleBadge festivalRole={inviteDetails.festivalRole} />
          </div>

          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              Invitation sent to{" "}
              <span className="font-medium text-foreground">
                {inviteDetails.email}
              </span>
            </span>
          </div>

          {emailMismatch ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    You&apos;re signed in as a different account
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This invite is for{" "}
                    <span className="font-medium text-foreground">
                      {inviteDetails.email}
                    </span>
                    , but you&apos;re signed in as{" "}
                    <span className="font-medium text-foreground">
                      {signedInEmail}
                    </span>
                    . You can still join with your current account, or switch to
                    the invited email.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseInvitedEmail}
                disabled={switchingAccount}
                className="mt-3 w-full rounded-lg font-medium"
              >
                {switchingAccount ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Use {inviteDetails.email} instead
              </Button>
            </div>
          ) : !isAuthenticated ? (
            <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Accepting signs you in as{" "}
              <span className="font-medium text-foreground">
                {inviteDetails.email}
              </span>{" "}
              and sets up your Greenroom account — no password needed.
            </p>
          ) : null}

          <Button
            onClick={acceptInvitation}
            disabled={isAccepting}
            className="w-full rounded-xl font-semibold"
          >
            {emailMismatch
              ? "Join with current account"
              : `Join ${inviteDetails.festivalName}`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Shell>
  );
}
