import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminFestivalsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Festivals</h2>
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden border border-border/50">
            <CardContent className="p-0">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
