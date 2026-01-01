import { format } from "date-fns";
import { HardDrive, LayoutList, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch Festival
  const festival = await findFestivalBySlugOrId(slug);

  if (!festival) notFound();

  // Helper to format numbers
  const fmt = (n: number | undefined) => n?.toLocaleString() || "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5">
        {festival.expiresAt && (
          <div className="bg-muted/50 p-2 text-xs text-center text-muted-foreground border-b mb-4">
            Expires on {new Date(festival.expiresAt).toLocaleDateString()}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmt(festival._count?.students)}
              </div>
              <p className="text-xs text-muted-foreground">Registered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Programmes</CardTitle>
              <LayoutList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmt(festival._count?.programmes)}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmt(festival.storageUsedMB)} MB
              </div>
              <p className="text-xs text-muted-foreground">Used</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
