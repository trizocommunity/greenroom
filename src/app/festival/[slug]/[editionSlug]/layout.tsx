import { notFound, redirect } from "next/navigation";
import { FestivalDashboardSidebar } from "@/components/festival/dashboard/FestivalDashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { differenceInDays } from "date-fns";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import {
  DashboardPanelContent,
  DashboardRightPanel,
} from "@/components/festival/dashboard/DashboardRightPanel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditionCountdownBanner } from "@/components/festival/editions/EditionCountdownBanner";
import { FrozenEditionBanner } from "@/components/festival/editions/FrozenEditionBanner";

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

      {/* Center Content */}
      <div className="flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0">
        <header className="sticky top-0 z-10 w-full flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-6 shadow-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-2 h-8 w-8" />
            <div className="mr-2 h-4 w-px bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/festival/${festivalSlug}`}>
                    Festival
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href={`/festival/${festivalSlug}/${editionSlug}`}
                  >
                    {activeEdition.name || editionSlug}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Mobile Right Panel Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden h-8 w-8 text-muted-foreground"
              >
                <PanelRight className="h-5 w-5" />
                <span className="sr-only">Open Festival Info</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="p-6 w-80 sm:w-96 overflow-y-auto"
            >
              <DashboardPanelContent
                festivalSlug={festival.slug}
                festivalName={festival.name}
                editionName={activeEdition.name || editionSlug}
                editionStatus={activeEdition.status}
                daysRemaining={daysRemaining}
                userRole={userRole}
                activeEdition={{
                  tierLabel: activeEdition.tierLabel,
                  limits: activeEdition.limits || {
                    maxParticipants: 1000,
                    maxEvents: 50,
                    maxJudges: 20,
                    maxStorageMB: 1024,
                  },
                  usage: {
                    participantsCount: activeEdition.participantsCount,
                    eventsCount: activeEdition.eventsCount,
                    judgesCount: activeEdition.judgesCount,
                    storageUsedMB: activeEdition.storageUsedMB,
                  },
                }}
                className="mt-4" // Add some top margin inside sheet
              />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-8 relative overflow-hidden">
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
            <EditionCountdownBanner
              endDate={activeEdition.endDate}
              status={activeEdition.status}
              className="mb-4"
            />
            <FrozenEditionBanner
              status={activeEdition.status}
              className="mb-4"
            />
            {children}
          </FestivalProvider>
        </main>
      </div>

      {/* Right Panel - Hidden on smaller screens, visible on XL */}
      <DashboardRightPanel
        festivalSlug={festival.slug}
        festivalName={festival.name}
        editionName={activeEdition.name || editionSlug}
        editionStatus={activeEdition.status}
        daysRemaining={daysRemaining}
        userRole={userRole}
        activeEdition={{
          tierLabel: activeEdition.tierLabel,
          limits: activeEdition.limits || {
            maxParticipants: 1000,
            maxEvents: 50,
            maxJudges: 20,
            maxStorageMB: 1024,
          }, // Fallback
          usage: {
            participantsCount: activeEdition.participantsCount,
            eventsCount: activeEdition.eventsCount,
            judgesCount: activeEdition.judgesCount,
            storageUsedMB: activeEdition.storageUsedMB,
          },
        }}
      />
    </SidebarProvider>
  );
}
