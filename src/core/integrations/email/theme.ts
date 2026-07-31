import type { Config } from "tailwindcss";
import { DARK_TOKENS, LIGHT_TOKENS, type EmailTheme, type EmailTokens } from "./tokens";

/**
 * Tailwind config for Greenroom branded emails.
 *
 * Two variants — dark and light — keyed off `EmailTheme`. The
 * `<Tailwind>` component takes one of these per render so each email
 * produces a fully-inlined HTML body with no CSS-variable references
 * (email clients don't honour them).
 *
 * Semantic class names mirror the official React Email templates:
 *   bg-canvas / bg-surface / border-stroke / text-fg / text-fg-2 /
 *   text-fg-3 / bg-brand / text-fg-inverted
 *
 * Custom font sizes match the Greenroom visual scale.
 */

const configFor = (t: EmailTokens): Omit<Config, "content"> => ({
	theme: {
		extend: {
			colors: {
				canvas: t.bg,
				surface: t.surface,
				stroke: t.border,
				fg: t.heading,
				"fg-2": t.text,
				"fg-3": t.textMuted,
				brand: t.primary,
				"brand-hover": t.primaryHover,
				"fg-inverted": "#ffffff",
			},
			fontSize: {
				"11": ["11px", { lineHeight: "16px" }],
				"13": ["13px", { lineHeight: "20px" }],
				"14": ["14px", { lineHeight: "22px" }],
				"15": ["15px", { lineHeight: "24px" }],
				"20": ["20px", { lineHeight: "28px" }],
				"24": ["24px", { lineHeight: "32px" }],
				"32": ["32px", { lineHeight: "40px" }],
				"48": ["48px", { lineHeight: "56px" }],
			},
			spacing: {
				"4.5": "1.125rem",
			},
			borderRadius: {
				md: "8px",
				lg: "12px",
				xl: "16px",
			},
			fontFamily: {
				sans: [
					"'Outfit'",
					"ui-sans-serif",
					"system-ui",
					"-apple-system",
					"Segoe UI",
					"Roboto",
					"sans-serif",
				],
			},
		},
	},
});

export const DARK_TAILWIND_CONFIG = configFor(DARK_TOKENS);
export const LIGHT_TAILWIND_CONFIG = configFor(LIGHT_TOKENS);

export function getEmailConfig(theme: EmailTheme) {
	return theme === "dark" ? DARK_TAILWIND_CONFIG : LIGHT_TAILWIND_CONFIG;
}
