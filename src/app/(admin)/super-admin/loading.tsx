import { AdminStatsSkeleton } from "@/components/ui/Skeletons";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your platform statistics
        </p>
      </div>

      <AdminStatsSkeleton />

      <div className="aspect-video rounded-2xl border border-dashed border-border bg-muted/20 md:col-span-3 min-h-[300px] animate-pulse" />
    </div>
  );
}
