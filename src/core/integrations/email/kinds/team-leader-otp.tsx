import { Heading, Text } from "@react-email/components";
import { EmailFooter } from "../components/Footer";
import { BrandedLayout } from "../components/Layout";
import { EmailWordmark } from "../components/Wordmark";
import type { EmailTheme } from "../tokens";

const SUBJECT = (festivalName: string) =>
	`[Greenroom] ${festivalName}: Team Leader login OTP`;

export interface TeamLeaderOtpProps {
	otp: string;
	festivalName: string;
	expiresInMinutes?: number;
	theme?: EmailTheme;
}

export function TeamLeaderOtpEmail({
	otp,
	festivalName,
	expiresInMinutes = 10,
	theme = "dark",
}: TeamLeaderOtpProps) {
	return (
		<BrandedLayout
			theme={theme}
			preview={`Your ${festivalName} Team Leader OTP — expires in ${expiresInMinutes} minutes`}
		>
			<EmailWordmark />
			<Text className="m-0 mb-2 font-sans text-11 font-semibold uppercase tracking-[0.18em] text-brand">
				{festivalName}
			</Text>
			<Heading className="m-0 mb-2 font-sans font-bold text-24 text-fg">
				Team Leader login OTP
			</Heading>
			<Text className="m-0 mb-6 font-sans text-15 text-fg-2">
				Use this code to sign in to the Team Leader panel for{" "}
				<span className="text-fg font-semibold">{festivalName}</span>. It
				expires in{" "}
				<span className="text-fg font-semibold">
					{expiresInMinutes} minutes
				</span>
				.
			</Text>
			<Text className="bg-brand text-fg-inverted rounded-md px-4 py-2.5 font-sans font-bold text-20 tracking-[0.25em] inline-block">
				{otp}
			</Text>
			<EmailFooter note="If you did not request this code, you can ignore this email." />
		</BrandedLayout>
	);
}

export const teamLeaderOtpSubject = SUBJECT;
