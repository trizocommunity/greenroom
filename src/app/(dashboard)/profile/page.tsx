import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profile | Greenroom",
  description: "View your profile information",
};

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <ProfileView user={user as any} />
    </div>
  );
}
