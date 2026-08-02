import Link from "next/link";
import { PUBLIC_CONTAINER } from "@/components/festival/public/PublicSection";
import type { FestivalPublicData } from "./FestivalContext";

interface FestivalFooterProps {
  festival: FestivalPublicData;
}

export function FestivalFooter({ festival }: FestivalFooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div
        className={`${PUBLIC_CONTAINER} py-6 flex flex-wrap items-center justify-between gap-3 text-left`}
      >
        <span className="font-medium text-sm text-heading">
          {festival.name}
        </span>
        <span className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} · Powered by{" "}
          <Link href="/" className="hover:text-foreground">
            Greenroom
          </Link>
        </span>
      </div>
    </footer>
  );
}
