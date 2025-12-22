import { notFound } from "next/navigation";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findEditionByFestivalAndSlug } from "@/server/models/edition.model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Star,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

// Mock Data fallbacks to make the UI look rich
const MOCK_DATA = {
  heroImage:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2670&auto=format&fit=crop",
  aboutImage:
    "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=2670&auto=format&fit=crop",
  stats: [
    { label: "Participants", value: "500+", icon: Users },
    { label: "Events", value: "40", icon: Trophy },
    { label: "Guest Judges", value: "12", icon: Star },
  ],
  organization: {
    name: "Trizo Cultural Foundation",
    description:
      "Dedicated to promoting arts and culture across the region through meticulously organized festivals and events.",
    founded: "2020",
  },
};

export default async function PublicEditionPage({
  params,
}: {
  params: Promise<{ slug: string; editionSlug: string }>;
}) {
  const { slug, editionSlug } = await params;

  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  const edition = await findEditionByFestivalAndSlug(festival.id, editionSlug);
  if (!edition) return notFound();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* 1. Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10" />
          <Image
            src={MOCK_DATA.heroImage}
            alt="Festival Crowd"
            fill
            className="object-cover"
          />
        </div>

        <div className="container relative z-20 text-center px-4 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {festival.status === "ACTIVE"
              ? "Accepting Registrations"
              : "Coming Soon"}
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase drop-shadow-2xl">
            {festival.name}
            <span className="block text-transparent bg-clip-text bg-linear-to-r from-primary via-purple-400 to-pink-400">
              {edition.name || `Edition ${edition.number}`}
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto font-light">
            Join us for the {edition.number}
            {getOrdinalSuffix(edition.number)} edition. Celebrating art,
            culture, and community excellence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            {edition.status === "ACTIVE" ? (
              <Button
                size="lg"
                className="h-14 px-8 rounded-full text-lg font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Register Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                disabled
                variant="secondary"
                className="h-14 px-8 rounded-full"
              >
                Registration Closed
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 rounded-full text-lg border-white/20 hover:bg-white/10 text-white backdrop-blur-sm"
            >
              View Schedule
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Key Info Bar */}
      <section className="bg-muted/50 border-y border-border backdrop-blur-sm -mt-20 relative z-30 mx-4 md:mx-auto max-w-5xl rounded-xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-6 flex items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">
                Dates
              </p>
              <p className="font-bold">
                {format(new Date(edition.startDate), "MMM d")} -{" "}
                {format(new Date(edition.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="p-6 flex items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">
                Location
              </p>
              <p className="font-bold">
                {festival.orgLocation || "Campus Main Grounds"}
              </p>
            </div>
          </div>
          <div className="p-6 flex items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Info className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">
                Organizer
              </p>
              <p className="font-bold">
                {festival.orgName || MOCK_DATA.organization.name}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. About / Highlights Section */}
      <section className="py-24 container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="mb-2">
              About The Edition
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight">
              Experience the Magic of <br /> {edition.name || "This Season"}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {festival.description || MOCK_DATA.organization.description}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This year, we are raising the bar with more events, bigger prizes,
              and an unforgettable atmosphere. Whether you are competing or
              cheering, {festival.name} promises memories that last a lifetime.
            </p>

            <div className="grid grid-cols-3 gap-8 pt-8">
              {MOCK_DATA.stats.map((stat, i) => (
                <div key={i} className="text-center md:text-left">
                  <p className="text-3xl font-black text-primary">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-linear-to-tr from-primary to-purple-500 rounded-2xl blur-lg opacity-30 animate-pulse" />
            <Image
              src={MOCK_DATA.aboutImage}
              alt="Festival Highlights"
              fill
              className="rounded-2xl shadow-2xl object-cover rotate-3 hover:rotate-0 transition-transform duration-500"
            />
          </div>
        </div>
      </section>

      {/* 4. Organization Details (Footer-like but prominent) */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-8">Organized by</h2>
          <div className="max-w-3xl mx-auto bg-background rounded-2xl p-8 shadow-sm border flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-primary">
              {(festival.orgName || "T").charAt(0)}
            </div>
            <h3 className="text-xl font-bold">
              {festival.orgName || MOCK_DATA.organization.name}
            </h3>
            <p className="text-muted-foreground mt-2 mb-6 max-w-lg">
              {festival.orgDescription || MOCK_DATA.organization.description}
            </p>
            {festival.orgWebsite && (
              <Button variant="outline" asChild>
                <a href={festival.orgWebsite} target="_blank" rel="noopener">
                  Visit Website
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function getOrdinalSuffix(i: number) {
  var j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
}
