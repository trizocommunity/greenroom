import { redirect } from "next/navigation";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/server/models/user.model";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const user = await findUserById(session.userId);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar user={user} />
      <div className="pt-20">{children}</div>
    </div>
  );
}
