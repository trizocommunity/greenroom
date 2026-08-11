import { headers } from "next/headers";
import { FestivalNotFoundView } from "@/components/festival/public/FestivalNotFoundView";

/**
 * Renders for any 404 under the public festival surface. The host decides where
 * the CTAs point, so the branded-host flag is read here and handed down.
 */
export default async function FestivalPublicNotFound() {
  const customDomain = (await headers()).get("x-custom-domain");
  return <FestivalNotFoundView isCustomDomain={!!customDomain} />;
}
