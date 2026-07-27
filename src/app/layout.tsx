import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Instrument_Serif, Outfit } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import QueryProvider from "@/components/providers/QueryProvider";
import { RazorpayInit } from "@/components/razorpay/RazorpayInit";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
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
  title: "Greenroom | Paperless Festival Management",
  description:
    "A premium, reliable platform to run large-scale festivals without chaos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`${outfit.variable} ${instrumentSerif.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <NextTopLoader height={2} color="#d72626" showSpinner={false} />
        <QueryProvider>
          <RazorpayInit />
          <main className="flex-1">{children}</main>
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </QueryProvider>
      </body>
    </html>
  );
}
