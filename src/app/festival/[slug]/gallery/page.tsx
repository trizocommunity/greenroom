import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { GalleryClient } from "./GalleryClient";

async function getFestivalWithGallery(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      galleryImages: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalWithGallery(slug);
  
  if (!festival) {
    notFound();
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 
          className="text-3xl font-bold"
          style={{ color: festival.accentColor }}
        >
          Gallery
        </h1>
        
        <GalleryClient 
          images={festival.galleryImages} 
          accentColor={festival.accentColor}
        />
      </div>
    </div>
  );
}
