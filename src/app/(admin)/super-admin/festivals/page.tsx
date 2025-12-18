import { FestivalsTable } from "@/components/super-admin/FestivalsTable";

export default function FestivalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Festivals</h2>
        <p className="text-muted-foreground">
          Manage all festivals on the platform
        </p>
      </div>

      <FestivalsTable />
    </div>
  );
}
