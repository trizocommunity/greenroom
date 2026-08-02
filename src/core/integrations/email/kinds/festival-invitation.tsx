import { Heading, Text } from "@react-email/components";
import { EmailButton } from "../components/Button";
import { EmailFooter } from "../components/Footer";
import { BrandedLayout } from "../components/Layout";
import { EmailWordmark } from "../components/Wordmark";
import type { EmailTheme } from "../tokens";

const SUBJECT = (festivalName: string) =>
  `[Greenroom] You've been invited to ${festivalName}`;

export interface FestivalInvitationProps {
  url: string;
  festivalName: string;
  role: string;
  expiresInHours?: number;
  theme?: EmailTheme;
}

export function FestivalInvitationEmail({
  url,
  festivalName,
  role,
  expiresInHours = 48,
  theme = "light",
}: FestivalInvitationProps) {
  return (
    <BrandedLayout
      theme={theme}
      preview={`You've been invited to join ${festivalName} on Greenroom`}
    >
      <EmailWordmark />
      <Text className="m-0 mb-2 font-sans text-11 font-semibold uppercase tracking-[0.18em] text-brand">
        {festivalName}
      </Text>
      <Heading className="m-0 mb-4 font-sans font-bold text-24 text-fg">
        You've been invited
      </Heading>
      <Text className="m-0 mb-6 font-sans text-15 text-fg-2">
        You've been invited to join{" "}
        <span className="text-fg font-semibold">{festivalName}</span> as{" "}
        <span className="text-fg font-semibold">{role}</span>.
      </Text>
      <EmailButton href={url}>Accept Invitation</EmailButton>
      <EmailFooter
        note={`This invitation expires in ${expiresInHours} hours. If you weren't expecting this, you can ignore the email.`}
      />
    </BrandedLayout>
  );
}

export const festivalInvitationSubject = SUBJECT;
