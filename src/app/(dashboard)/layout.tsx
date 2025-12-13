import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  
  if (!session) {
      redirect("/login");
  }

  return (
    <>
      <DashboardNavbar />
      <div className="pt-20">
        {children}
      </div>
    </>
  );
}
