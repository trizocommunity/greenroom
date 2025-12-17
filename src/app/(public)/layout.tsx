import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { getSession } from "@/lib/auth/session";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <>
      <Navbar user={session} />
      <div className="pt-20">{children}</div>
      <Footer />
    </>
  );
}
