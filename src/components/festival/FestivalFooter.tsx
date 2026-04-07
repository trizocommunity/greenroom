import { Instagram, Link2, MapPin, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { FestivalPublicData } from "./FestivalContext";

interface FestivalFooterProps {
  festival: FestivalPublicData;
}

export function FestivalFooter({ festival }: FestivalFooterProps) {
  return (
    <footer className="mt-auto border-t border-white/10 bg-linear-to-t from-slate-950 via-slate-950/98 to-slate-900/90">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Festival Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {festival.logo ? (
                <Image
                  src={festival.logo}
                  alt={festival.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain rounded-lg bg-black/40"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-lg text-primary-foreground bg-primary shadow-lg">
                  {festival.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-base text-slate-50">
                  {festival.name}
                </p>
                <p className="text-xs text-slate-400">
                  {festival.orgName || "Festival organizers"}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300/90 line-clamp-3">
              {festival.tagline || festival.description}
            </p>
            {festival.location && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {festival.location}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200">
              Explore
            </h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link
                href={`/${festival.slug}/about`}
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                About the festival
              </Link>
              <Link
                href={`/${festival.slug}/sessions`}
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                Programs & sessions
              </Link>
              <Link
                href={`/${festival.slug}/results`}
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                Results & rankings
              </Link>
              <Link
                href={`/${festival.slug}/gallery`}
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                Photo gallery
              </Link>
            </nav>
          </div>

          {/* Organization Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200">
              Organized by
            </h4>
            <p className="font-medium text-slate-100">
              {festival.orgName || "Festival committee"}
            </p>
            {festival.tier &&
              festival.tier !== "BASIC" &&
              festival.orgDescription && (
                <p className="text-sm text-slate-400 line-clamp-2">
                  {festival.orgDescription}
                </p>
              )}
            <p className="text-sm text-slate-400">
              {festival.orgLocation || festival.location || ""}
            </p>
            {festival.orgWebsite && (
              <a
                href={festival.orgWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline text-primary"
              >
                <Link2 className="h-3.5 w-3.5" />
                Visit organization website
              </a>
            )}
          </div>

          {/* Social / Powered by */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200">
              Stay connected
            </h4>
            <div className="flex gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
                aria-label="Follow on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
                aria-label="Follow on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </button>
            </div>
            <div className="pt-4 border-t border-white/10 text-xs text-slate-500 space-y-1">
              <p>
                © {new Date().getFullYear()} {festival.name}. All rights
                reserved.
              </p>
              <p className="flex items-center gap-1">
                <span>Powered by</span>
                <Link
                  href="/"
                  className="font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  Greenroom
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
