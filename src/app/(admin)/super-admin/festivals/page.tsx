import { LayoutGrid } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFestivalCard } from "@/components/admin/AdminFestivalCard";
import { adminService } from "@/server/services/admin.service";

export default async function AdminFestivalsPage() {
  const festivals = await adminService.getFestivalsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Festivals</h2>
        <p className="text-muted-foreground">
          Governance and oversight of all festivals
        </p>
      </div>

      {festivals.length === 0 ? (
        <AdminEmptyState
          icon={<LayoutGrid className="h-10 w-10 text-primary animate-pulse" />}
          title="No Festivals Found"
          description="The platform is currently waiting for its first festival. Once users create festivals, they will appear here with full governance controls."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {festivals.map((festival) => (
            <AdminFestivalCard key={festival.id} festival={festival} />
          ))}
        </div>
      )}
    </div>
  );
}
