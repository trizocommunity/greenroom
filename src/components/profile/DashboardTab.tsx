import { type User } from "@prisma/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_JOINED_FESTIVALS } from "@/data/user-festivals.mock";
import { JoinedFestivalCard } from "./JoinedFestivalCard";
import type { JoinedFestival } from "@/types/festival";

interface DashboardTabProps {
  user: User & {
    fullName: string | null;
    displayName: string | null;
    age: number | null;
  };
}

export function DashboardTab({ user }: DashboardTabProps) {
  // Mock data for joined festivals
  const joinedFestivals: JoinedFestival[] =
    MOCK_JOINED_FESTIVALS as unknown as JoinedFestival[];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground">
          Welcome back, {user.displayName || user.fullName || "User"}!
        </h2>
        <p className="text-muted-foreground">Your activity overview.</p>
      </div>

      {/* Main Content: Joined Festivals */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-primary w-5 h-5" />
            Joined Festivals
          </h3>
          <Button>
            Join Festival
            <Search className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {joinedFestivals.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardHeader className="text-center py-12">
              <CardTitle>You haven't joined any festivals yet.</CardTitle>
              <p className="text-muted-foreground mt-2">
                Join a festival to start participating in events.
              </p>
              <div className="flex justify-center pt-4">
                <Button>
                  Find a Festival
                  <Search className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {joinedFestivals.map((festival) => (
              <JoinedFestivalCard key={festival.id} festival={festival} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
