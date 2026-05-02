import { Instagram, Link2, MapPin, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { FestivalPublicData } from "./FestivalContext";

interface FestivalFooterProps {
  festival: FestivalPublicData;
}

export function FestivalFooter({ festival }: FestivalFooterProps) {
  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {festival.logo ? (
              <Image
                src={festival.logo}
                alt={festival.name}
                width={32}
                height={32}
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm text-primary-foreground bg-primary">
                {festival.name.charAt(0)}
              </div>
            )}
            <span className="font-medium text-sm text-slate-200">
              {festival.name}
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <Link href={`/${festival.slug}/about`} className="hover:text-slate-100">About</Link>
            <Link href={`/${festival.slug}/sessions`} className="hover:text-slate-100">Sessions</Link>
            <Link href={`/${festival.slug}/results`} className="hover:text-slate-100">Results</Link>
            <Link href={`/${festival.slug}/gallery`} className="hover:text-slate-100">Gallery</Link>
          </nav>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} · Powered by{" "}
            <Link href="/" className="hover:text-slate-300">Greenroom</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
