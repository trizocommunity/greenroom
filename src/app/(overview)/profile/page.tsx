import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_CONTAINER } from "@/components/app/AppSection";
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
    <div className={`${APP_CONTAINER} py-10 md:py-14`}>
      <ProfileView user={user as any} />
    </div>
  );
}
