import { findFestivalBySlug } from "@/server/models/festival.model";
import { notFound, redirect } from "next/navigation";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SchedulePage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  const canManageSchedule = await getEffectiveFeatureEnabled(
    festival.tier,
    "schedule",
  );
  if (!canManageSchedule) {
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=schedule`,
    );
  }

  return (
    <div className="container pt-4 sm:pt-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage programme and event schedule for your festival.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>
                View and manage sessions, programmes, and events by date. Schedule
                content is shown on your public Sessions page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Schedule builder and session management will appear here. For now,
            use Programmes and Events to organise your festival content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
