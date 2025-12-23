import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/services/auth.service";
import { EditionCreationWizard } from "@/components/festival/editions/EditionCreationWizard";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CreateEditionPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const festival = await prisma.festival.findUnique({
    where: { slug },
    include: { editions: { where: { status: "ACTIVE" } } },
  });

  if (!festival) redirect("/404");

  // Security check: must be owner
  if (festival.ownerId !== user.id) redirect("/");

  // Logic check: if active edition exists, redirect to dashboard
  if (festival.editions.length > 0) {
    redirect(`/festival/${slug}`);
  }

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center text-muted-foreground">
            {festival.name}
          </h1>
        </div>
        <EditionCreationWizard
          festivalId={festival.id}
          festivalSlug={festival.slug}
          userId={user.id}
        />
      </div>
    </div>
  );
}
