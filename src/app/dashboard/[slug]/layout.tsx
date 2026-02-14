import { ExternalLink, Menu } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardRightSidebar } from "@/components/festival/dashboard/DashboardRightSidebar";
import { FestivalDashboardSidebar } from "@/components/festival/dashboard/FestivalDashboardSidebar";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import QueryProvider from "@/components/providers/QueryProvider";
// Removed unused breadcrumb imports
import { DashboardBreadcrumb } from "@/components/festival/dashboard/DashboardBreadcrumb";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TIER_CONFIG } from "@/config/pricing";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";

export default async function FestivalDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Fetch Festival
  const festival = await findFestivalBySlugOrId(slug);
  if (!festival) notFound();

  // 2. Auth Guard
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const isCreator = festival.ownerId === session.userId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  let role = isSuperAdmin ? "SUPER_ADMIN" : isCreator ? "OWNER" : "";

  if (!isCreator && !isSuperAdmin) {
    // Check if team member
    const member = await prisma.festivalMember.findUnique({
      where: {
        festivalId_userId: {
          festivalId: festival.id,
          userId: session.userId,
        },
      },
    });

    if (member?.isActive) {
      role = member.role;
    } else {
      redirect("/");
    }
  }

  // 3. Expiry Guard (Strict Blocking)
  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());

  if (isExpired) {
    redirect("/profile?error=expired");
  }

  // ... (previous code)

  // 4. Prepare Data
  const tierLimits = TIER_CONFIG[festival.tier || "STANDARD"].limits;

  const festivalData = {
    // ... (festival data construction)
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    status: festival.status,
    tier: festival.tier,
    accentColor: "#000000",
    expiresAt: festival.expiresAt,
    description: festival.description || "",
    // Legacy fields or unused
    tagline: "",
    startDate: new Date().toISOString(), // Placeholder
    endDate: festival.expiresAt ? festival.expiresAt.toISOString() : null,
    location: festival.location || "Virtual",
    logo: null,
    heroImage: null,
    orgName: festival.institutionName || "Organization",
    orgDescription: null,
    orgWebsite: null,
    orgLocation: null,
    establishedYear: null,
    // New Stats from Festival
    studentsCount: festival.studentsCount || 0,
    programmesCount: festival.programmesCount || 0,
    eventsCount: festival.eventsCount || 0,
    stagesCount: festival.stagesCount || 0,
    limits: {
      maxStudents: tierLimits.students,
      maxProgrammes: tierLimits.programmes,
      maxEvents: tierLimits.events,
      maxStages: tierLimits.stages,
      maxStorageMB: tierLimits.storageMB,
    },
    studentCreationDeadline: festival.studentCreationDeadline,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
  };

  const userRole = role;

  // 4b. Fetch User Profile
  const currentUser = await getCurrentUser();

  const userData = {
    name: currentUser?.displayName || currentUser?.fullName || "User",
    email: currentUser?.email || "",
    image: null, // Add image if available in session/db lookup
  };

  return (
    <QueryProvider>
      <SidebarProvider>
        <FestivalProvider festival={festivalData}>
          <FestivalDashboardSidebar festival={festivalData} role={userRole} />

          <SidebarInset>
            <header className="sticky top-0 z-10 w-full flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-8 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="hidden md:block ">
                  <SidebarTrigger className="h-8 w-8" />
                </span>
                <div className="mr-2 h-4 w-px bg-border" />
                <DashboardBreadcrumb slug={slug} />{" "}
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/${slug}`}
                  className="hidden md:block"
                  target="_blank"
                >
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <DashboardRightSidebar
                  trigger={
                    <Button variant="ghost" size="icon" className="">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle user menu</span>
                    </Button>
                  }
                  user={userData}
                  festivalSlug={slug}
                  festivalName={festival.name}
                  festivalStatus={festival.status}
                  daysRemaining={
                    festival.expiresAt
                      ? Math.ceil(
                          (new Date(festival.expiresAt).getTime() -
                            Date.now()) /
                            (1000 * 60 * 60 * 24),
                        )
                      : null
                  }
                  userRole={userRole}
                  usage={{
                    studentsCount: festival._count?.students || 0,
                    programmesCount: festival._count?.programmes || 0,
                    eventsCount: festival.eventsCount || 0,
                    stagesCount: festival.stagesCount || 0,
                    storageUsedMB: 0, // Placeholder
                  }}
                  limits={festivalData.limits}
                  tierLabel={festival.tier || "Standard"}
                />
              </div>
            </header>

            <main className="flex flex-1 flex-col gap-6 p-8 relative overflow-hidden">
              {children}
            </main>
          </SidebarInset>
        </FestivalProvider>
      </SidebarProvider>
    </QueryProvider>
  );
}
