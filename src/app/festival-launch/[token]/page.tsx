import { notFound } from "next/navigation";
import { StageLaunchController } from "@/components/festival/launch/StageLaunchController";
import { verifyPairing } from "@/features/festivals/services/launch-pairing.service";

/**
 * Public stage-controller page. Resolves the pairing token to its
 * festival record and renders a single screen. No nav, no chrome — the
 * operator hands this URL (or 6-digit code via the typed fallback below)
 * to the guest on stage.
 *
 * Auth: the token is the auth. Anyone with the URL can fire launch,
 * which is by design — the token is the capability. We constrain it
 * with a festival-scoped TTL and one-per-festival minting; the
 * underlying `setPublicSiteEnabledAction` still requires admin session
 * on the display laptop to actually run.
 *
 * `publicUrl` is passed in so the controller can preload the iframe
 * with the path-URL the operator's preview also uses. Vercel/Redis DNS
 * resolves that path to the branded host for end visitors, but the
 * stage device is on the same app host so the path works directly.
 *
 * We deliberately do NOT pass `?remote=1` here. That flag tells the
 * public layout to strip navbar/footer/banner chrome — useful for the
 * dashboard's preview iframe, but wrong for the paired device: the
 * guest's tablet is the *audience's* view of the festival site after
 * launch, so it should look like the site everyone else sees, with
 * navbar and footer intact. Pre-launch the curtains still cover the
 * iframe so the guest sees only the buzzer regardless.
 */
export default async function StageLaunchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pairing = await verifyPairing(token);
  if (!pairing) notFound();

  return (
    <StageLaunchController
      festivalId={pairing.festivalId}
      token={token}
      publicUrl={`/${pairing.slug}`}
    />
  );
}
