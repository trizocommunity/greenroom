import type { ReactNode } from "react";
import { requireParticipantAuth } from "@/core/auth/participant-guard";

export default async function TeamLeaderProtectedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  await requireParticipantAuth(slug, studentSlug, true);
  return children;
}
