import { findFestivalBySlug } from "@/server/models/festival.model";
import { notFound, redirect } from "next/navigation";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { APP_URL } from "@/config/routes";
import { QrCodesClient } from "@/components/festival/pre-works/qr-codes/QrCodesClient";
import { QrCodesHowItWorks } from "@/components/festival/pre-works/qr-codes/QrCodesHowItWorks";

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

  const baseUrl = APP_URL.replace(/\/$/, "");

  return (
    <div className="container pt-4 sm:pt-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            QR Codes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Each student has a unique QR code. Scan to view profile and
            programmes. Download as JPEG, share, or print all as PDF.
          </p>
        </div>
        <QrCodesHowItWorks />
      </div>
      <QrCodesClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        festivalName={festival.name}
        baseUrl={baseUrl}
      />
    </div>
  );
}
