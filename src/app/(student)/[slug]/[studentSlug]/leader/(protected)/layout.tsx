import type { ReactNode } from "react";
import { requireTeamLeaderSession } from "@/lib/team-leader-auth/guard";

export default async function TeamLeaderProtectedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  await requireTeamLeaderSession({ slug, studentSlug });
  return children;
}
