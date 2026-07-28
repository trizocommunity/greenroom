import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
// Removed unused breadcrumb imports
import { DashboardBreadcrumb } from "@/components/festival/dashboard/DashboardBreadcrumb";
import { DashboardCelebration } from "@/components/festival/dashboard/DashboardCelebration";
import { DashboardRightSidebar } from "@/components/festival/dashboard/DashboardRightSidebar";
import { FestivalDashboardClientShell } from "@/components/festival/dashboard/FestivalDashboardClientShell";
import { FestivalDashboardSidebar } from "@/components/festival/dashboard/FestivalDashboardSidebar";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalStatusBadge } from "@/components/festival/FestivalStatusBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TIER_CONFIG } from "@/config/pricing";
import { getCurrentUser } from "@/core/auth/current-user";
import { getSession } from "@/core/auth/session";
import { parseStoredInstant } from "@/core/utils/date-time";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";
import { getEffectiveTierFeatures } from "@/features/plan-features/services/plan-features.service";
import { getResolvedTier } from "@/features/plan-features/services/tier";

export default async function FestivalDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Auth Guard
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  const festivalContext = await getFestivalContext({
    slugOrId: slug,
    userId: session.userId,
    globalRole: session.role,
  });

  if (!festivalContext) notFound();

  const { festival, role, isExpired } = festivalContext;

  if (role === "NONE") {
    redirect("/");
  }

  // 3. Expiry Guard — no read-only; expired = redirect to profile
  if (isExpired) {
    redirect("/profile?error=expired");
  }

  // 4. Prepare Data
  const tierLimits = TIER_CONFIG[getResolvedTier(festival.tier)].limits;
  const effectiveFeatures = await getEffectiveTierFeatures(
    getResolvedTier(festival.tier),
  );

  const derivedStatus = getDerivedFestivalStatus({
    status: festival.status ?? "READY",
    startDate: festival.startDate,
    endDate: festival.endDate,
    expiresAt: festival.expiresAt,
  });

  const festivalData = {
    // ... (festival data construction)
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    status: derivedStatus,
    tier: festival.tier,
    accentColor: "#000000",
    expiresAt: festival.expiresAt,
    description: festival.description || "",
    // Legacy fields or unused
    tagline: "",
    startDate: festival.startDate || null,
    endDate: festival.endDate || null,
    location: festival.location || "Virtual",
    logo: null,
    orgName: festival.institutionName || "Organization",
    orgDescription: null,
    orgWebsite: null,
    orgLocation: null,
    establishedYear: null,
    // New Stats from Festival
    studentsCount: festival.studentsCount || 0,
    programmesCount: festival.programmesCount || 0,
    stagesCount: festival.stagesCount || 0,
    limits: {
      maxStudents: tierLimits.students,
      maxProgrammes: tierLimits.programmes,
      maxStages: tierLimits.stages,
      maxStorageMB: tierLimits.storageMB,
    },
    studentCreationDeadline: festival.studentCreationDeadline,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
    effectiveFeatures,
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
    <SidebarProvider defaultOpen={false}>
      <FestivalProvider festival={festivalData}>
        <FestivalDashboardClientShell>
          <FestivalDashboardSidebar festival={festivalData} role={userRole} />

          <SidebarInset>
            <header className="sticky top-0 z-10 w-full flex h-14 shrink-0 items-center justify-between border-b bg-card/95 backdrop-blur px-2 md:px-8 shadow-sm">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="h-8 w-8" />
                <div className="mr-2 h-4 w-px bg-border hidden lg:block" />
                <DashboardBreadcrumb slug={slug} />
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <FestivalStatusBadge
                  status={derivedStatus}
                  createdAt={festival.createdAt}
                  startDate={festival.startDate}
                  endDate={festival.endDate}
                  expiresAt={festival.expiresAt}
                  size="default"
                  interactive={true}
                />
                <DashboardRightSidebar
                  user={userData}
                  festivalSlug={slug}
                  showStatusAndUsage={
                    userRole === "OWNER" || userRole === "SUPER_ADMIN"
                  }
                  festivalName={festival.name}
                  festivalStatus={derivedStatus}
                  festivalCreatedAt={festival.createdAt}
                  festivalStartDate={festival.startDate}
                  festivalEndDate={festival.endDate}
                  festivalExpiresAt={festival.expiresAt}
                  daysRemaining={
                    festival.expiresAt
                      ? Math.ceil(
                          (parseStoredInstant(festival.expiresAt).getTime() -
                            Date.now()) /
                            (1000 * 60 * 60 * 24),
                        )
                      : null
                  }
                  userRole={userRole}
                  usage={{
                    studentsCount: festival._count?.students || 0,
                    programmesCount: festival._count?.programmes || 0,
                    stagesCount: festival.stagesCount || 0,
                    storageUsedMB: festival.storageUsedMb ?? 0,
                  }}
                  limits={festivalData.limits}
                  tierLabel={TIER_CONFIG[getResolvedTier(festival.tier)].label}
                  canAccessSettings={effectiveFeatures.festivalSettings}
                />
              </div>
            </header>

            <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-8 relative overflow-hidden">
              <Suspense fallback={null}>
                <DashboardCelebration />
              </Suspense>
              {children}
            </main>
          </SidebarInset>
        </FestivalDashboardClientShell>
      </FestivalProvider>
    </SidebarProvider>
  );
}
