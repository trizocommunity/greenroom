import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import {
  Instrument_Serif,
  Noto_Sans_Malayalam,
  Outfit,
} from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { GlobalErrorRegion } from "@/components/errors";
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { RazorpayInit } from "@/components/razorpay/RazorpayInit";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
});

const malayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  variable: "--font-malayalam",
  weight: ["400", "500", "600", "700"],
});

// Editorial display serif used sparingly for premium headline moments on
// public-facing pages (marketing site, festival public site). The rest of
// the app, including the dashboard, keeps using Outfit as before.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://greenroomfestivals.in"),
  title: {
    default: "Greenroom | Paperless Festival Management",
    template: "%s | Greenroom",
  },
  description:
    "A premium, reliable platform to run large-scale festivals, competitions, and youth fests without paper or chaos. Automate scoring, schedules, and certificates.",
  applicationName: "Greenroom",
  keywords: [
    // Core Brand
    "Greenroom",
    "Greenroom Festival Management",
    "Paperless Festival",

    // Festival Types
    "Cultural Fest Software",
    "Arts Festival Management",
    "Art Fest Software",
    "Live Festivals Management",
    "Youth Fest Management",
    "Competition Tabulation Software",
    "School Annual Day Software",
    "Music and Dance Competition Scoring",
    "Quiz and Debate League Management",

    // Kerala Specific & Regional
    "Kalolsavam Management Software",
    "Sahithyolsavam Software",
    "Madrasa Fest Tabulation",
    "Kerala Arts Festival Software",
    "Mahotsavam Management",

    // National & International
    "Inter-college Fest Management",
    "University Youth Festival Software",
    "Global Festival Management SaaS",
    "Live Scoring for Competitions",
    "Judges Scoring App",
  ],
  authors: [{ name: "Trizo" }],
  creator: "Trizo",
  publisher: "Trizo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Greenroom | Paperless Festival Management",
    description:
      "Run your next large-scale festival without the paperwork. One platform for participants, schedules, and live scoring.",
    url: "https://greenroomfestivals.in",
    siteName: "Greenroom",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Greenroom | Paperless Festival Management",
    description: "Run your next large-scale festival without the paperwork.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Greenroom",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#d72626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://greenroomfestivals.in/#organization",
        name: "Greenroom",
        url: "https://greenroomfestivals.in",
        logo: "https://greenroomfestivals.in/icons/apple-touch-icon.png",
        description:
          "Greenroom is a paperless festival and competition management software platform.",
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://greenroomfestivals.in/#software",
        name: "Greenroom",
        url: "https://greenroomfestivals.in",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        description:
          "A premium platform to manage large-scale cultural festivals, arts fests, and competitions.",
        provider: {
          "@id": "https://greenroomfestivals.in/#organization",
        },
      },
    ],
  };

  return (
    <html
      lang="en"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`${outfit.variable} ${instrumentSerif.variable} ${malayalam.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextTopLoader height={2} color="#d72626" showSpinner={false} />
        <ThemeProvider>
          <QueryProvider>
            <RazorpayInit />
            <main className="flex-1">{children}</main>
            <Toaster />
            <GlobalErrorRegion />
            <Analytics />
            <SpeedInsights />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
