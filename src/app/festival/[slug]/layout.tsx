import { ExternalLink, User } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { FestivalDashboardSidebar } from "@/components/festival/dashboard/FestivalDashboardSidebar";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { prisma } from "@/lib/db";

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

    if (member && member.role === "TEAM_LEADER" && member.isActive) {
      role = "TEAM_LEADER";
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

  // 4. Prepare Data
  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    status: festival.status,
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
    participantsCount: festival.participantsCount || 0,
    eventsCount: festival.eventsCount || 0,
    limits: {
      maxParticipants: 1000, // Default or fetch from Festival.branding/settings
      maxEvents: 100,
      maxJudges: 20,
    },
  };

  const userRole = role;

  return (
    <SidebarProvider>
      <FestivalDashboardSidebar festival={festivalData} role={userRole} />

      <SidebarInset>
        <header className="sticky top-0 z-10 w-full flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-8 shadow-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-2 h-8 w-8" />
            <div className="mr-2 h-4 w-px bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/festival/${slug}`}>
                    Festival
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              asChild
              title="View Public Page"
            >
              <Link href={`/${slug}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">View Public Page</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              asChild
              title="My Profile"
            >
              <Link href="/profile">
                <User className="h-4 w-4" />
                <span className="sr-only">My Profile</span>
              </Link>
            </Button>

            <LogoutButton
              variant="ghost"
              size="icon"
              showText={false}
              showIcon={true}
              className="hidden md:flex"
            />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-8 relative overflow-hidden">
          <FestivalProvider festival={festivalData}>
            {/* We might display an expiry banner here */}
            {festival.expiresAt && (
              <div className="bg-muted/50 p-2 text-xs text-center text-muted-foreground border-b mb-4">
                Expires on {new Date(festival.expiresAt).toLocaleDateString()}
              </div>
            )}
            {children}
          </FestivalProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
