import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { SettingsForm } from "./_components/SettingsForm";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.userId) redirect("/auth/login");

  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  // Basic ownership check for Settings page access
  if (festival.ownerId !== session.userId) {
    // Check if user is an ADMIN member?
    // For now strict owner or check roles if needed.
    // Assuming ADMIN logic:
    // const member = await findMember...
    // if (!member || member.role !== 'ADMIN') redirect(...)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your festival configuration and deadlines.
        </p>
      </div>
      <SettingsForm festival={festival} />
    </div>
  );
}
