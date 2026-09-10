import { QrCode } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VolunteerOverviewProps {
  festivalSlug: string;
}

export function VolunteerOverview({ festivalSlug }: VolunteerOverviewProps) {
  const basePath = `/dashboard/${festivalSlug}`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Scan participants at checkpoints and assist with day-to-day festival
          operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`${basePath}/event-works/checkpoints`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Checkpoints</CardTitle>
                  <CardDescription>
                    Scan participant QR codes for attendance, food, and more.
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
