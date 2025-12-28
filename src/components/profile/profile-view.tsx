"use client";

import type { User } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { ProfileSidebarContent } from "./ProfileSidebarContent";
import { BillingTab } from "./tabs/BillingTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { FestivalsTab } from "./tabs/FestivalsTab";

interface UserWithProfile extends User {
  fullName: string | null;
  displayName: string | null;
  age: number | null;
}

interface ProfileViewProps {
  user: UserWithProfile;
}

export function ProfileView({ user }: ProfileViewProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const displayName =
    user.displayName || user.fullName || user.email.split("@")[0];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-full md:w-64 shrink-0">
        <ProfileSidebarContent user={user} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {activeTab === "overview" && (
          <OverviewTab displayName={displayName} userId={user.id} />
        )}
        {activeTab === "billing" && <BillingTab />}
        {activeTab === "festivals" && <FestivalsTab userId={user.id} />}
      </main>
    </div>
  );
}
