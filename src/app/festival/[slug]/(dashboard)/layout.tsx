import { notFound, redirect } from "next/navigation";
import { FestivalDashboardSidebar } from "@/components/festival/dashboard/FestivalDashboardSidebar";
import { StatusStrip } from "@/components/dashboard/StatusStrip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/session";
import { findFestivalById } from "@/server/models/festival.model";
import { differenceInDays } from "date-fns";
import { ExpiryBanner } from "@/components/dashboard/ExpiryBanner";
import { FestivalProvider } from "@/components/festival/FestivalContext";

export default async function FestivalDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  // NOTE: In Phase 1, we use ID as the slug.
  // The route param is named `slug` but it contains the Festival ID.
  const { slug: festivalId } = await params;
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    notFound();
  }

  // Protect Dashboard Access
  const session = await getSession();

  // 1. Must be logged in
  if (!session?.userId) {
    redirect("/login");
  }

  // 2. Must be creator or admin (TODO: Expand role check later for judges/admins)
  const isCreator = festival.ownerId === session.userId; // Use ownerId not creatorId per schema
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  if (!isCreator && !isSuperAdmin) {
    // Redirect to public site if no access (TODO: Check other roles)
    // For now, simple protection.
    redirect("/");
  }

  // Determine Active Edition
  // Logic: Find edition that is ACTIVE, or the latest one.
  // For Phase 5, let's just take the first ACTIVE one or the most recent one.
  const activeEdition =
    festival.editions.find((e) => e.status === "ACTIVE") ||
    festival.editions[0];

  let daysRemaining: number | null = null;
  if (activeEdition && activeEdition.status === "ACTIVE") {
    // Calculate days remaining (assuming endsAt exists and is future)
    // If endsAt is past, it should technically be expired/frozen, but logic depends on scheduler.
    // For UI, we just show diff.
    daysRemaining = differenceInDays(
      new Date(activeEdition.endDate),
      new Date(),
    );
  }

  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.id, // Using ID as slug
    status: festival.status,
    accentColor: "#000000", // Default accent color, Phase 1 has no field
    expiresAt: null, // Phase 1 has no expiry
    // Mocking missing fields for Phase 5 compat
    description: "",
    tagline: "",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    location: "Virtual",
    logo: null,
    heroImage: null,
    orgName: "Organization",
    orgDescription: null,
    orgWebsite: null,
    orgLocation: null,
    orgEstablishedYear: null,
  };

  // User Role calculation
  const userRole = isSuperAdmin ? "SUPER_ADMIN" : "OWNER";

  return (
    <SidebarProvider>
      <FestivalDashboardSidebar role={session.role} festival={festivalData} />
      <div className="flex flex-1 flex-col transition-all duration-300 ease-in-out">
        {/* Header with Status Strip */}
        <header className="sticky top-0 z-10 w-full flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur px-6 shadow-sm">
          <SidebarTrigger className="-ml-2 h-8 w-8" />
          <div className="mr-2 h-4 w-px bg-border" />

          <StatusStrip
            festivalName={festival.name}
            editionName={activeEdition?.name || "No Editions"}
            editionStatus={activeEdition?.status || null}
            daysRemaining={daysRemaining}
            userRole={userRole}
          />
        </header>

        <main className="flex flex-1 flex-col gap-6 p-8 relative">
          {activeEdition &&
            activeEdition.status === "ACTIVE" &&
            daysRemaining !== null && (
              <ExpiryBanner
                status={activeEdition.status}
                daysRemaining={daysRemaining}
              />
            )}

          <FestivalProvider
            festival={{
              ...festivalData,
              activeEdition: activeEdition
                ? {
                    id: activeEdition.id,
                    name:
                      activeEdition.name || `Edition ${activeEdition.number}`,
                    status: activeEdition.status,
                    participantsCount: activeEdition.participantsCount,
                    limits: activeEdition.limits,
                  }
                : null,
            }}
          >
            {children}
          </FestivalProvider>
        </main>
      </div>
    </SidebarProvider>
  );
}
