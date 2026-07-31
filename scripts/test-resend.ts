import "dotenv/config";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
	console.error("RESEND_API_KEY is not set in .env");
	process.exit(1);
}

const recipient = process.argv[2];
if (!recipient) {
	console.error(
		"Usage: npx tsx scripts/test-resend.ts <recipient-email> [--from=<override>]",
	);
	process.exit(1);
}

const fromOverride = process.argv.find((a) => a.startsWith("--from="));
const from = fromOverride
	? fromOverride.slice("--from=".length)
	: (process.env.EMAIL_FROM ?? "Greenroom <info@trizocreatives.in>");

async function sendTestEmail() {
	const resend = new Resend(resendApiKey);

	const sentAt = new Date().toISOString();
	const subject = "Greenroom Resend smoke test";
	const text = [
		"If you're reading this, Resend is wired up correctly.",
		``,
		`Sent at: ${sentAt}`,
		`From:     ${from}`,
		`To:       ${recipient}`,
		``,
		"— Greenroom scripts/test-resend.ts",
	].join("\n");

	console.log(`Sending test email to ${recipient} from ${from}…`);

	const { data, error } = await resend.emails.send({
		from,
		to: recipient,
		subject,
		text,
		html: `<p>If you're reading this, <strong>Resend is wired up correctly</strong>.</p>
<p>Sent at: <code>${sentAt}</code><br/>From: <code>${from}</code><br/>To: <code>${recipient}</code></p>
<hr/><p style="color:#6b7280;font-size:12px;">Greenroom scripts/test-resend.ts</p>`,
	});

	if (error) {
		console.error("Resend returned an error:");
		console.error(JSON.stringify(error, null, 2));
		process.exit(1);
	}

	console.log("Sent. Resend response:");
	console.log(JSON.stringify(data, null, 2));
}

sendTestEmail().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
