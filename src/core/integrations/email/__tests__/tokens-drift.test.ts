import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DARK_TOKENS, LIGHT_TOKENS } from "../tokens";

/**
 * Drift guard — every hex value in `tokens.ts` must match the value in
 * `src/app/globals.css`. Update both files together; this test will fail
 * the build if the palette diverges.
 *
 * The parser is intentionally minimal: it pulls `--name: value;` pairs
 * from two distinct blocks (`:root { ... }` for light mode and
 * `.dark { ... }` for dark mode). Not a real CSS parser, but enough for
 * the palette blocks we own.
 */

const CSS_FILE = path.resolve(
	__dirname,
	"..",
	"..",
	"..",
	"..",
	"app",
	"globals.css",
);

function parseBlock(css: string, selector: string): Map<string, string> {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const blockRe = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g");
	const vars = new Map<string, string>();
	let blockMatch: RegExpExecArray | null = blockRe.exec(css);
	while (blockMatch !== null) {
		const body = blockMatch[1] ?? "";
		const varRe = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
		let m: RegExpExecArray | null = varRe.exec(body);
		while (m !== null) {
			vars.set(m[1].trim(), m[2].trim());
			m = varRe.exec(body);
		}
		blockMatch = blockRe.exec(css);
	}
	return vars;
}

function resolveValue(raw: string, vars: Map<string, string>): string {
	const m = /^var\((--[a-z0-9-]+)\)$/i.exec(raw);
	if (m) {
		const resolved = vars.get(m[1]);
		if (!resolved) throw new Error(`unresolved CSS var ${m[1]}`);
		return resolveValue(resolved, vars);
	}
	return raw;
}

const css = readFileSync(CSS_FILE, "utf8");
const rootVars = parseBlock(css, ":root");
const darkVars = parseBlock(css, ".dark");

function cssHex(scope: "root" | "dark", tokenName: string): string {
	const vars = scope === "root" ? rootVars : darkVars;
	const raw = vars.get(`--${tokenName}`);
	if (!raw) {
		throw new Error(
			`--${tokenName} not found in globals.css ${scope} block`,
		);
	}
	return resolveValue(raw, vars).toLowerCase();
}

describe("email tokens — drift guard", () => {
	it("DARK_TOKENS match globals.css .dark palette", () => {
		expect(DARK_TOKENS.primary.toLowerCase()).toBe(cssHex("dark", "primary"));
		expect(DARK_TOKENS.primaryHover.toLowerCase()).toBe(
			cssHex("dark", "primary-hover"),
		);
		expect(DARK_TOKENS.bg.toLowerCase()).toBe(cssHex("dark", "bg"));
		expect(DARK_TOKENS.surface.toLowerCase()).toBe(cssHex("dark", "surface"));
		expect(DARK_TOKENS.border.toLowerCase()).toBe(cssHex("dark", "border"));
		expect(DARK_TOKENS.text.toLowerCase()).toBe(cssHex("dark", "text"));
		expect(DARK_TOKENS.textMuted.toLowerCase()).toBe(
			cssHex("dark", "text-muted"),
		);
		expect(DARK_TOKENS.heading.toLowerCase()).toBe(cssHex("dark", "heading"));
	});

	it("LIGHT_TOKENS match globals.css :root palette", () => {
		expect(LIGHT_TOKENS.primary.toLowerCase()).toBe(cssHex("root", "primary"));
		expect(LIGHT_TOKENS.primaryHover.toLowerCase()).toBe(
			cssHex("root", "primary-hover"),
		);
		expect(LIGHT_TOKENS.bg.toLowerCase()).toBe(cssHex("root", "bg"));
		expect(LIGHT_TOKENS.surface.toLowerCase()).toBe(cssHex("root", "surface"));
		expect(LIGHT_TOKENS.border.toLowerCase()).toBe(cssHex("root", "border"));
		expect(LIGHT_TOKENS.text.toLowerCase()).toBe(cssHex("root", "text"));
		expect(LIGHT_TOKENS.textMuted.toLowerCase()).toBe(
			cssHex("root", "text-muted"),
		);
		expect(LIGHT_TOKENS.heading.toLowerCase()).toBe(cssHex("root", "heading"));
	});
});
