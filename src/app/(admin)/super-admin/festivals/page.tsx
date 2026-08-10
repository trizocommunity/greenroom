import { LayoutGrid } from "lucide-react";
import { Suspense } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFestivalCard } from "@/components/admin/AdminFestivalCard";
import { FestivalStatusTabs } from "@/components/super-admin/FestivalStatusTabs";
import { adminService } from "@/features/admin/services/admin.service";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";

export default async function AdminFestivalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const allFestivals = await adminService.getFestivalsForAdmin();
  const festivals =
    statusFilter === "EXPIRED"
      ? allFestivals.filter(
          (f) =>
            getDerivedFestivalStatus({
              status: f.status ?? "READY",
              startDate: f.startDate,
              endDate: f.endDate,
              expiresAt: f.expiresAt,
            }) === "EXPIRED",
        )
      : allFestivals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Festivals
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Governance and oversight of all festivals
          </p>
        </div>
        <Suspense fallback={null}>
          <FestivalStatusTabs />
        </Suspense>
      </div>

      {festivals.length === 0 ? (
        <AdminEmptyState
          icon={<LayoutGrid className="h-8 w-8 text-primary" />}
          title={
            statusFilter === "EXPIRED"
              ? "No expired festivals"
              : "No festivals found"
          }
          description={
            statusFilter === "EXPIRED"
              ? "No expired festivals match this filter. Try viewing All festivals."
              : "The platform is currently waiting for its first festival. Once users create festivals, they will appear here with full governance controls."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {festivals.map((festival) => (
            <AdminFestivalCard
              key={festival.id}
              festival={{
                ...festival,
                status: getDerivedFestivalStatus({
                  status: festival.status ?? "READY",
                  startDate: festival.startDate,
                  endDate: festival.endDate,
                  expiresAt: festival.expiresAt,
                }),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
