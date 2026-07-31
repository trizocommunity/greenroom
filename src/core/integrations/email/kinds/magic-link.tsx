import { Heading, Text } from "@react-email/components";
import { EmailButton } from "../components/Button";
import { EmailFooter } from "../components/Footer";
import { BrandedLayout } from "../components/Layout";
import { EmailWordmark } from "../components/Wordmark";
import type { EmailTheme } from "../tokens";

const SUBJECT = "[Greenroom] Your sign-in link";

export interface MagicLinkProps {
	url: string;
	expiresInMinutes?: number;
	theme?: EmailTheme;
}

export function MagicLinkEmail({
	url,
	expiresInMinutes = 15,
	theme = "dark",
}: MagicLinkProps) {
	return (
		<BrandedLayout theme={theme} preview={`Sign in to Greenroom — link expires in ${expiresInMinutes} minutes`}>
			<EmailWordmark />
			<Heading className="m-0 mb-2 font-sans font-bold text-24 text-fg">
				Sign in to Greenroom
			</Heading>
			<Text className="m-0 mb-6 font-sans text-15 text-fg-2">
				Click the button below to sign in to your Greenroom account.{" "}
				This link expires in{" "}
				<span className="text-fg font-semibold">
					{expiresInMinutes} minutes
				</span>
				.
			</Text>
			<EmailButton href={url}>Sign In</EmailButton>
			<EmailFooter note="If you didn't request this, you can safely ignore this email." />
		</BrandedLayout>
	);
}
