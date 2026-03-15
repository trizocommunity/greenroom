import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Megaphone } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFestivalContext } from "@/server/services/festival-context.service";
import { getSession } from "@/lib/auth/session";

export default async function StageManagerOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });

  if (!context || context.role !== "STAGE_MANAGER") notFound();

  const basePath = `/dashboard/${slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Stage Manager Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage stages and view the schedule for your festival.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href={`${basePath}/pre-works/stage-management`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Megaphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Stage Management</CardTitle>
                  <CardDescription>
                    Manage stages and programme flow for the event.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`${basePath}/pre-works/schedule`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Schedule</CardTitle>
                  <CardDescription>
                    View and manage the festival schedule and sessions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
