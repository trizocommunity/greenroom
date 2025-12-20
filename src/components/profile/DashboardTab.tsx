"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFestivals } from "@/hooks/useFestivals";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { FestivalAccessCard } from "./FestivalAccessCard";
import { CreateFestivalModal } from "./CreateFestivalModal";
import type { User } from "@prisma/client";

interface DashboardTabProps {
  user: User & {
    fullName: string | null;
    displayName: string | null;
    age: number | null;
  };
}

export function DashboardTab({ user }: DashboardTabProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: festivals = [] } = useFestivals();
  const { data: paymentStatus } = usePaymentStatus();

  const hasCreatedFestival = festivals.length > 0;

  const handleCreateClick = () => {
    if (hasCreatedFestival) {
      toast.error("You can only create one festival.");
      return;
    }

    if (!paymentStatus?.canCreateFestival) {
      toast.error("Complete payment to create a festival", {
        description: "Go to the Billing tab to complete your payment.",
        action: {
          label: "Go to Billing",
          onClick: () => router.push("/profile?tab=billing"),
        },
      });
      return;
    }
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground">
          Welcome back, {user.displayName || user.fullName || "User"}!
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* User Details Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Full Name
            </div>
            <div className="text-base">{user.fullName || "-"}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Email
            </div>
            <div className="text-base">{user.email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Role
            </div>
            <div className="text-base capitalize">
              {user.globalRole.toLowerCase()}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Status
            </div>
            <div className="text-base">
              {user.isActive ? (
                <span className="text-green-500 font-medium">Active</span>
              ) : (
                <span className="text-red-500 font-medium">Inactive</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Festival Access Status */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-widest text-foreground">
          Festival Access
        </h3>
        <FestivalAccessCard
          onCreateClick={handleCreateClick}
          hasCreatedFestival={hasCreatedFestival}
        />
      </div>

      <CreateFestivalModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
