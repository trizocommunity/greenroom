import { notFound, redirect } from "next/navigation";
import { FestivalDashboardSidebar } from "@/components/festival/dashboard/FestivalDashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { StatusStrip } from "@/components/dashboard/StatusStrip";
import { differenceInDays } from "date-fns";
import { FestivalProvider } from "@/components/festival/FestivalContext";

export default async function EditionDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; editionSlug: string }>;
}) {
  const { slug: festivalSlug, editionSlug } = await params;

  // 1. Fetch Festival & Edition
  const festival = await findFestivalBySlugOrId(festivalSlug);
  if (!festival) notFound();

  // 2. Auth Guard
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const isCreator = festival.ownerId === session.userId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  if (!isCreator && !isSuperAdmin) redirect("/");

  // 3. Find specific edition
  const activeEdition = festival.editions.find((e) => e.slug === editionSlug);
  if (!activeEdition) notFound();

  // 4. Calculate Stats
  const daysRemaining = differenceInDays(
    new Date(activeEdition.endDate),
    new Date(),
  );

  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    status: festival.status,
    accentColor: "#000000",
    expiresAt: null,
    // Mocking fields
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
    establishedYear: null,
  };

  const userRole = isSuperAdmin ? "SUPER_ADMIN" : "OWNER";

  return (
    <SidebarProvider>
      <FestivalDashboardSidebar
        role={session.role}
        festival={festivalData}
        hasActiveEdition={activeEdition.status === "ACTIVE"}
      />
      <div className="flex flex-1 flex-col transition-all duration-300 ease-in-out">
        <header className="sticky top-0 z-10 w-full flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur px-6 shadow-sm">
          <SidebarTrigger className="-ml-2 h-8 w-8" />
          <div className="mr-2 h-4 w-px bg-border" />
          <StatusStrip
            festivalName={festival.name}
            editionName={activeEdition.name || editionSlug}
            editionStatus={activeEdition.status}
            daysRemaining={daysRemaining}
            userRole={userRole}
          />
        </header>

        <main className="flex flex-1 flex-col gap-6 p-8 relative">
          <FestivalProvider
            festival={{
              ...festivalData,
              activeEdition: {
                id: activeEdition.id,
                name: activeEdition.name || `Edition ${activeEdition.number}`,
                status: activeEdition.status,
                participantsCount: activeEdition.participantsCount,
                limits: activeEdition.limits,
              },
            }}
          >
            {children}
          </FestivalProvider>
        </main>
      </div>
    </SidebarProvider>
  );
}
