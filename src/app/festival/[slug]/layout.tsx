import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { FestivalFooter } from "@/components/festival/FestivalFooter";

async function getFestivalBySlug(slug: string) {
  const festival = await prisma.festival.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      tagline: true,
      startDate: true,
      endDate: true,
      location: true,
      status: true,
      accentColor: true,
      logo: true,
      heroImage: true,
      orgName: true,
      orgDescription: true,
      orgWebsite: true,
      orgLocation: true,
      orgEstablishedYear: true,
    },
  });
  
  return festival;
}

export default async function FestivalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);
  
  if (!festival || !festival.slug) {
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
    <div className="min-h-screen flex flex-col">
      <FestivalNavbar festival={festivalData} isLoggedIn={isLoggedIn} />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <FestivalFooter festival={festivalData} />
    </div>
  );
}
