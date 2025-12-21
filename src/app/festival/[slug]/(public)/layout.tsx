import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { getSession } from "@/lib/auth/session";
import { findFestivalById } from "@/server/models/festival.model";

export default async function FestivalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalId } = await params;
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    notFound();
  }

  // Check if user is logged in
  const session = await getSession();
  const isLoggedIn = !!session?.userId;

  // Transform for client component
  // Mock missing Phase 2 fields if FestivalProvider needs them
  const festivalData = {
    ...festival,
    slug: festival.id,
    startDate: new Date().toISOString(), // Mocking dates as they are not on Festival
    endDate: new Date().toISOString(),
    description: "",
    tagline: "",
    location: "",
    accentColor: "#000000",
    activeEdition: null,
    logo: null,
    heroImage: null,
    orgName: "",
    orgDescription: "",
    orgWebsite: "",
    orgLocation: "",
    orgEstablishedYear: null,
  };

  return (
    <FestivalProvider festival={festivalData}>
      <div className="min-h-screen flex flex-col">
        <FestivalNavbar festival={festivalData} isLoggedIn={isLoggedIn} />
        <main className="flex-1 pt-16">{children}</main>
        <FestivalFooter festival={festivalData} />
      </div>
    </FestivalProvider>
  );
}
