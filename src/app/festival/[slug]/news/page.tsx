import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

async function getFestivalWithNews(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      newsItems: {
        orderBy: { publishedAt: "desc" },
      },
    },
  });
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalWithNews(slug);
  
  if (!festival) {
    notFound();
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 
          className="text-3xl font-bold"
          style={{ color: festival.accentColor }}
        >
          News & Updates
        </h1>
        
        {festival.newsItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                No news updates yet. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {festival.newsItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(item.publishedAt, "MMMM d, yyyy")}</span>
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  {item.excerpt && (
                    <CardDescription className="text-base">
                      {item.excerpt}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {item.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
