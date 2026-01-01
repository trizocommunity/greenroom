import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${outfit.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <QueryProvider>
          <main className="flex-1">{children}</main>
          <Toaster />
          <Analytics />
        </QueryProvider>
      </body>
    </html>
  );
}
