/**
 * Brand colour tokens for Greenroom transactional emails.
 *
 * Mirrors `src/app/globals.css` exactly — the runtime drift test in
 * `__tests__/tokens-drift.test.ts` enforces this. Update both files together.
 *
 * Email clients don't honour CSS variables, so we inline the values on every
 * style prop. Keep this file as the single source of truth so any palette
 * change in `globals.css` only needs to be mirrored here.
 */

export type EmailTheme = "dark" | "light";

export type EmailTokens = {
	readonly bg: string;
	readonly surface: string;
	readonly border: string;
	readonly text: string;
	readonly textMuted: string;
	readonly heading: string;
	readonly primary: string;
	readonly primaryHover: string;
};

/** Dark palette — matches `.dark` block in globals.css (lines 100-134). */
export const DARK_TOKENS: EmailTokens = {
	bg: "#0b0e14",
	surface: "#12151f",
	border: "#232735",
	text: "#e5e7eb",
	textMuted: "#9ca3af",
	heading: "#f9fafb",
	primary: "#ef4444",
	primaryHover: "#f87171",
};

/** Light palette — matches `:root` block in globals.css (lines 40-98). */
export const LIGHT_TOKENS: EmailTokens = {
	bg: "#f7f8fa",
	surface: "#ffffff",
	border: "#e5e7eb",
	text: "#1f2937",
	textMuted: "#6b7280",
	heading: "#111827",
	primary: "#d72626",
	primaryHover: "#b91c1c",
};

export function getTokens(theme: EmailTheme): EmailTokens {
	return theme === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
}
