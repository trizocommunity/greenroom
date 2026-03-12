-- AlterTable: add public site visibility flag to festival
ALTER TABLE "festival" ADD COLUMN "publicSiteEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: gallery images for public festival site (non-BASIC)
CREATE TABLE "festival_gallery_image" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_gallery_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable: news posts for public festival site (non-BASIC)
CREATE TABLE "festival_news" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "festival_gallery_image_festivalId_idx" ON "festival_gallery_image"("festivalId");
CREATE INDEX "festival_news_festivalId_idx" ON "festival_news"("festivalId");

-- AddForeignKey
ALTER TABLE "festival_gallery_image" ADD CONSTRAINT "festival_gallery_image_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "festival_news" ADD CONSTRAINT "festival_news_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
