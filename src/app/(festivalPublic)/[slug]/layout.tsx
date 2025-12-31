import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db"; // Direct prisma usage for simple festival fetch or use a loader
import { findFestivalBySlug } from "@/server/models/festival.model"; // Use existing model if available

export default async function FestivalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;

  // Fetch basic festival info for the layout (Navbar/Footer)
  const festival = await findFestivalBySlug(festivalSlug);

  if (!festival) {
    notFound();
  }

  // Expiry Guard
  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());

  if (isExpired) {
    notFound(); // As per product definition: "After expiry... permanently deleted"
  }

  // Check if user is logged in
  const session = await getSession();
  const isLoggedIn = !!session?.userId;

  // Transform for client component
  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: "", // Feature coming later
    startDate: new Date().toISOString(), // Placeholder, page will override
    endDate: new Date().toISOString(), // Placeholder
    location: festival.orgLocation || "",
    status: festival.status,
    accentColor:
      festival.branding &&
      typeof festival.branding === "object" &&
      "colors" in festival.branding
        ? (festival.branding as any).colors?.primary || "#000000"
        : "#000000",
    logo:
      festival.branding &&
      typeof festival.branding === "object" &&
      "logo" in festival.branding
        ? (festival.branding as any).logo
        : null,
    heroImage:
      festival.branding &&
      typeof festival.branding === "object" &&
      "heroImage" in festival.branding
        ? (festival.branding as any).heroImage
        : null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
    studentsCount: festival.studentsCount || 0,
    eventsCount: festival.eventsCount || 0,
    limits: null,
    studentCreationDeadline: festival.studentCreationDeadline,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
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
