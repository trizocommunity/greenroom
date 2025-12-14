import { AppSidebar } from "@/components/dashboard/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/dashboard/AdminHeader"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession();

  if (!session || session.role !== "SUPER_ADMIN") {
      redirect("/profile");
  }

  return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AdminHeader />
          <div className="flex flex-1 flex-col gap-4 p-8 pt-22">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
  )
}
