import { adminService } from "@/server/services/admin.service";
import { AdminFestivalCard } from "@/components/admin/AdminFestivalCard";

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {festivals.map((festival) => (
          <AdminFestivalCard key={festival.id} festival={festival} />
        ))}
      </div>
    </div>
  );
}
