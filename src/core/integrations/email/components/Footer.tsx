import { Hr, Text } from "@react-email/components";

/**
 * Shared footer for every transactional email.
 * Brand line, product tagline, and (for kinds that need it) a
 * "you can ignore this" safety note.
 */
export function EmailFooter({
	note,
}: {
	/** Optional small-print note above the divider (e.g. "If you didn't request this, ignore this email."). */
	note?: string;
}) {
	return (
		<>
			{note ? (
				<Text className="mt-8 mb-0 font-sans text-13 text-fg-3">
					{note}
				</Text>
			) : null}
			<Hr className="border-stroke border-solid border-t my-8" />
			<Text className="m-0 font-sans text-11 text-fg-3">
				Greenroom &mdash; Festival Management Platform
			</Text>
		</>
	);
}
