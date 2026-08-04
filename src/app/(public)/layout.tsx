import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* No top spacer here on purpose. The navbar is a floating island, so
          each page's first section runs to the very top of the viewport and
          owns the padding that clears the navbar — otherwise the spacer
          shows as a blank band above every hero's background. */}
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
