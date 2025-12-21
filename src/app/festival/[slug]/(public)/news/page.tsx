import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { findFestivalById } from "@/server/models/festival.model";

export default async function NewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalId } = await params;
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    notFound();
  }

  // Phase 1 Schema has no News model. Mocking empty list.
  const newsItems: any[] = [];
  const accentColor = "#000000"; // Default

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold" style={{ color: accentColor }}>
          News & Updates
        </h1>

        {newsItems.length === 0 ? (
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
            {newsItems.map((item) => (
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
