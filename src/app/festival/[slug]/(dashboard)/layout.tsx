import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { FestivalDashboardSidebar } from "@/components/festival/dashboard/FestivalDashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { findFestivalBySlug } from "@/models/FestivalModel";

export default async function FestivalDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  
  if (!festival) {
    notFound();
  }
  
  // Protect Dashboard Access
  const session = await getSession();
  
  // 1. Must be logged in
  if (!session?.userId) {
    redirect('/login');
  }

  // 2. Must be creator or admin (TODO: Expand role check later for judges/admins)
  const isCreator = festival.creatorId === session.userId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  
  if (!isCreator && !isSuperAdmin) {
    // Redirect to public site if no access
    redirect(`/festival/${slug}`);
  }

  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    accentColor: festival.accentColor,
  };

  return (
    <SidebarProvider>
      <FestivalDashboardSidebar festival={festivalData} />
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="fixed top-0 w-full bg-white flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 z-50 border-b border-border">
          <div className="flex items-center gap-2 px-7">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-4 px-7">
            <span className="text-sm text-muted-foreground">
              {session.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Festival Admin'}
            </span>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-8 pt-22">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
