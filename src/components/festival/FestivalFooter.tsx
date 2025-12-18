import Link from "next/link";
import type { FestivalPublicData } from "./FestivalContext";

interface FestivalFooterProps {
  festival: FestivalPublicData;
}

export function FestivalFooter({ festival }: FestivalFooterProps) {
  return (
    <footer className="bg-muted/50 border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Festival Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {festival.logo ? (
                <img
                  src={festival.logo}
                  alt={festival.name}
                  className="h-10 w-10 object-contain rounded"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded flex items-center justify-center font-bold text-lg text-white"
                  style={{ backgroundColor: festival.accentColor }}
                >
                  {festival.name.charAt(0)}
                </div>
              )}
              <span className="font-bold text-lg">{festival.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {festival.tagline || festival.description}
            </p>
            <p className="text-sm text-muted-foreground">
              📍 {festival.location}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wider">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-2">
              <Link
                href={`/festival/${festival.slug}/about`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                href={`/festival/${festival.slug}/sessions`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sessions
              </Link>
              <Link
                href={`/festival/${festival.slug}/results`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Results
              </Link>
              <Link
                href={`/festival/${festival.slug}/gallery`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Gallery
              </Link>
            </nav>
          </div>

          {/* Organization Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wider">
              Organized By
            </h4>
            <p className="font-medium">{festival.orgName}</p>
            {festival.orgWebsite && (
              <a
                href={festival.orgWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline"
                style={{ color: festival.accentColor }}
              >
                Visit Website →
              </a>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {festival.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Powered by</span>
            <Link
              href="/"
              className="font-semibold hover:text-foreground transition-colors"
            >
              Greenroom
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
