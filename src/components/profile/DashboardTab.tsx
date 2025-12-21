"use client";

import { useMyFestival } from "@/hooks/useFestivals";
import { type User } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CreateFestivalModal } from "./CreateFestivalModal";
import { useRouter } from "next/navigation";

interface DashboardTabProps {
  user: User & {
    fullName: string | null;
    displayName: string | null;
    age: number | null;
  };
}

export function DashboardTab({ user }: DashboardTabProps) {
  const { data: festival } = useMyFestival();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const router = useRouter();

  const handleCreate = () => {
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground">
          Welcome back, {user.displayName || user.fullName || "User"}!
        </h2>
        <p className="text-muted-foreground">Your festival control center.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Name
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Your Festival
          </CardTitle>
        </CardHeader>
        <CardContent>
          {festival ? (
            <div className="space-y-2">
              <div className="text-xl font-bold">{festival.name}</div>
              <div className="text-sm text-muted-foreground font-mono">
                /{festival.slug}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/profile?tab=festivals")}
                >
                  Go to Festivals Tab
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You haven't created a festival yet.
              </p>
              <Button onClick={handleCreate}>
                Create Your Festival
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateFestivalModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
