import { redirect } from "next/navigation";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { UserTimezoneProviderClient } from "@/components/providers/user-timezone-provider-client";
import { getCurrentUser } from "@/core/auth/current-user";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.globalRole === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  if (!user.fullName) {
    redirect("/onboarding");
  }

  return (
    <UserTimezoneProviderClient userTimezone={user.timezone}>
      <div className="min-h-screen bg-background">
        <DashboardNavbar user={user} />
        <div className="pt-18">{children}</div>
      </div>
    </UserTimezoneProviderClient>
  );
}
