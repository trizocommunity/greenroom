"use client";

import { useSearchParams } from "next/navigation";
import type { UserProfile } from "@/core/types/app-enums";
import { ProfileSidebarContent } from "./ProfileSidebarContent";
import { BillingTab } from "./tabs/BillingTab";
import { FestivalsTab } from "./tabs/FestivalsTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { SettingsTab } from "./tabs/SettingsTab";

interface UserWithProfile extends UserProfile {
  id: string;
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
    <div className="flex flex-col gap-8 md:flex-row md:gap-14">
      {/* Sidebar — hidden on mobile, reachable from the top navigation menu */}
      <aside className="hidden w-52 shrink-0 md:block">
        <div className="sticky top-28">
          <ProfileSidebarContent user={user} />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {activeTab === "overview" && (
          <OverviewTab displayName={displayName} userId={user.id} />
        )}
        {activeTab === "billing" && <BillingTab />}
        {activeTab === "festivals" && <FestivalsTab userId={user.id} />}
        {activeTab === "settings" && <SettingsTab userId={user.id} />}
      </main>
    </div>
  );
}
