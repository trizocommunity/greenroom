import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";
import { getEmailConfig } from "../theme";
import type { EmailTheme } from "../tokens";

/**
 * Top-level chrome for every Greenroom email.
 *
 * - Wraps content in `<Tailwind>` so child components can use semantic
 *   class names (`bg-canvas`, `text-fg`, `bg-brand`, …).
 * - Sets up the global page background, font, and centred card container.
 * - Loads the Outfit font via Google Fonts so the rendered email matches
 *   the app's typography even when the recipient doesn't have it locally.
 *
 * The `theme` prop selects between dark and light Tailwind configs.
 * Callers pick the theme — either by reading their own `defaultTheme`
 * (set per kind in the kind's renderer) or by accepting a `theme`
 * override on the `sendEmail` public API.
 */
export function BrandedLayout({
  theme,
  preview,
  children,
}: {
  theme: EmailTheme;
  preview: string;
  children: ReactNode;
}) {
  return (
    <Tailwind config={getEmailConfig(theme)}>
      <Html lang="en">
        <Head>
          <Font
            fontFamily="Outfit"
            fallbackFontFamily="sans-serif"
            webFont={{
              url: "https://fonts.gstatic.com/s/outfit/v11/QGYvz_MVcBeNP4NJtEtq.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
        </Head>
        <Preview>{preview}</Preview>
        <Body className="bg-canvas m-0 p-0 font-sans">
          <Container className="bg-surface border border-solid border-stroke rounded-xl max-w-[480px] mx-auto my-10 p-10">
            {children}
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
