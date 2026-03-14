import { findFestivalBySlug } from "@/server/models/festival.model";
import { notFound, redirect } from "next/navigation";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { QrCode } from "lucide-react";
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

export default async function QrCodesPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  const canGenerateQR = await getEffectiveFeatureEnabled(
    festival.tier,
    "qrCodes",
  );
  if (!canGenerateQR) {
    redirect(
      `/dashboard/${slug}?error=upgrade_required&feature=qrCodes`,
    );
  }

  return (
    <div className="container pt-4 sm:pt-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          QR Codes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate and manage QR codes for programmes, students, or check-in.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>QR Codes</CardTitle>
              <CardDescription>
                Generate QR codes for quick access to programmes, student details, or event check-in. Scan with any QR reader to open links or show information.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            QR code generation and batch download will appear here. Use this to provide printable or digital QR codes for your festival.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
