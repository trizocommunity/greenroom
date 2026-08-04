import { Heading, Text } from "@react-email/components";
import { EmailButton } from "../components/Button";
import { EmailFooter } from "../components/Footer";
import { BrandedLayout } from "../components/Layout";
import { EmailWordmark } from "../components/Wordmark";
import type { EmailTheme } from "../tokens";

export interface FestivalExpiringSoonProps {
  festivalName: string;
  daysRemaining: number;
  expiresOn: string;
  dashboardUrl: string;
  theme?: EmailTheme;
}

export function FestivalExpiringSoonEmail({
  festivalName,
  daysRemaining,
  expiresOn,
  dashboardUrl,
  theme = "dark",
}: FestivalExpiringSoonProps) {
  return (
    <BrandedLayout
      theme={theme}
      preview={`${festivalName} expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} — back up your data`}
    >
      <EmailWordmark />
      <Text className="m-0 mb-2 font-sans text-11 font-semibold uppercase tracking-[0.18em] text-brand">
        {festivalName}
      </Text>
      <Heading className="m-0 mb-2 font-sans font-bold text-24 text-fg">
        Your festival expires soon
      </Heading>
      <Text className="m-0 mb-6 font-sans text-15 text-fg-2">
        The <span className="text-fg font-semibold">{festivalName}</span>{" "}
        festival access window ends in{" "}
        <span className="text-fg font-semibold">
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
        </span>{" "}
        (on <span className="text-fg font-semibold">{expiresOn}</span>). After
        that, the dashboard and public pages go read-only, and data is archived.
        Export anything you still need before the window closes.
      </Text>
      <EmailButton href={dashboardUrl}>Open Dashboard</EmailButton>
      <EmailFooter note="You're receiving this because you own this festival. Replies to this address aren't monitored." />
    </BrandedLayout>
  );
}
