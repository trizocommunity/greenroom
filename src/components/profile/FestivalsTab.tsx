"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { type Festival, useMyFestival } from "@/hooks/useFestivals";

import { CreateFestivalModal } from "./CreateFestivalModal";
import { EditFestivalModal } from "./EditFestivalModal";
import { FestivalCard } from "./FestivalCard";
import { FestivalEmptyState } from "./FestivalEmptyState";

import {
  ArrowRight,
  ExternalLink,
  LayoutDashboard,
  Pencil,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export function FestivalsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);

  // Use useMyFestival hook
  const { data: festival, isLoading } = useMyFestival();
  // festival is Festival | null | undefined

  const router = useRouter();

  const handleCreateClick = () => {
    if (festival) {
      toast.error("You can only create one festival.");
      return;
    }
    setIsCreateOpen(true);
  };

  const handleEdit = (festival: Festival) => {
    setEditingFestival(festival);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-10">
        {/* Section 1: Your Festival */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              <Skeleton className="h-52 rounded-lg" />
            </div>
          ) : !festival ? (
            <div className="py-16 rounded-lg border border-dashed bg-muted/20">
              <FestivalEmptyState />
              <div className="flex justify-center">
                <Button size="lg" onClick={handleCreateClick}>
                  Create Your Festival
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-zinc-900 via-zinc-900 to-black shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              {/* Ambient Background Glows */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                {/* Left Content */}
                <div className="space-y-6 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                      <Sparkles className="w-3 h-3" />
                      Your Festival
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Owner
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                      {festival.name}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-400 font-medium text-sm">
                      <span className="opacity-70">{festival.slug}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      asChild
                      size="lg"
                      className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12"
                    >
                      <Link href={`/festival/${festival.slug}`}>
                        Open Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="bg-black/20 border-white/10 hover:bg-white/5 h-12"
                    >
                      <Link href={`/${festival.slug}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Public Site
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => handleEdit(festival)}
                      className="h-12 hover:bg-white/5 text-zinc-400 hover:text-white"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Details
                    </Button>
                  </div>
                </div>

                {/* Right Content / Illustration */}
                <div className="hidden lg:block relative opacity-80 pointer-events-none">
                  <div className="absolute inset-0 bg-linear-to-l from-zinc-900 to-transparent z-10" />
                  <LayoutDashboard className="w-48 h-48 text-white/5 -rotate-12 transform translate-x-12" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateFestivalModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Edit Festival Modal - Might need updates if fields changed, but keeping connected for now */}
      <EditFestivalModal
        festival={editingFestival}
        open={!!editingFestival}
        onOpenChange={(open) => !open && setEditingFestival(null)}
      />
    </div>
  );
}
