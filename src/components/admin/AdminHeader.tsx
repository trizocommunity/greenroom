"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// SupportNotifications uses a Radix UI Popover which generates unique IDs
// during SSR that differ from the client-side IDs, causing a hydration
// mismatch. Disabling SSR here prevents the server from rendering IDs at all.
const SupportNotifications = dynamic(
  () =>
    import("@/components/dashboard/support/SupportNotifications").then(
      (m) => m.SupportNotifications,
    ),
  { ssr: false },
);

export function AdminHeader() {
  const pathname = usePathname();

  // Simple logic to determine page name
  const isUsers = pathname.includes("/users");
  const pageName = isUsers ? "Users" : "Dashboard";

  return (
    <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-xl flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-white/10">
      <div className="flex items-center gap-2 px-7">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{pageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="px-7">
        <SupportNotifications isAdmin={true} />
      </div>
    </header>
  );
}
