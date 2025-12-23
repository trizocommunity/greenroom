"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EditionStatus } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import React from "react";

interface EditionSelectorProps {
  currentEditionNumber: number;
  availableEditions: {
    id: string;
    number: number;
    name: string | null;
    status: EditionStatus;
  }[];
}

export function EditionSelector({
  currentEditionNumber,
  availableEditions,
}: EditionSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleValueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set("edition", value);
    router.push(`?${params.toString()}`);
  };

  if (availableEditions.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 relative group">
      <span className="text-sm text-muted-foreground hidden md:inline-block shadow-sm">
        View:
      </span>
      <div className="relative">
        <select
          value={currentEditionNumber.toString()}
          onChange={handleValueChange}
          className="w-[180px] appearance-none bg-background/50 backdrop-blur-md border border-white/10 text-white rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-background/70"
        >
          {availableEditions.map((edition) => (
            <option
              key={edition.id}
              value={edition.number.toString()}
              className="bg-zinc-900 text-white"
            >
              {edition.name ||
                `${edition.number}${getOrdinal(edition.number)} Edition`}
              {edition.status === EditionStatus.ACTIVE && " (Live)"}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none group-hover:text-white transition-colors" />
      </div>
    </div>
  );
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
