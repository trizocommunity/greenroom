import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { getCurrentUser } from "@/core/auth/current-user";

export const metadata: Metadata = {
  title: "Profile | Greenroom",
  description: "View your profile information",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.globalRole === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  return (
    <div className="container mx-auto max-w-7xl py-12 px-6">
      <ProfileView user={user as any} />
    </div>
  );
}
