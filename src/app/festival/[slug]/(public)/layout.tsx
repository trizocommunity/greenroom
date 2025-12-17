import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { findFestivalBySlug } from "@/models/FestivalModel";
import { FestivalProvider } from "@/components/festival/FestivalContext";

export default async function FestivalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  
  if (!festival) {
    notFound();
  }
  
  // Check if user is logged in
  const session = await getSession();
  const isLoggedIn = !!session?.userId;
  
  // Transform dates to strings for client component
  // Assert slug is non-null since we checked above
  const festivalData = {
    ...festival,
    slug: festival.slug,
    startDate: festival.startDate.toISOString(),
    endDate: festival.endDate.toISOString(),
  };

  return (
    <FestivalProvider festival={festivalData}>
      <div className="min-h-screen flex flex-col">
        <FestivalNavbar festival={festivalData} isLoggedIn={isLoggedIn} />
        <main className="flex-1 pt-16">
          {children}
        </main>
        <FestivalFooter festival={festivalData} />
      </div>
    </FestivalProvider>
  );
}
