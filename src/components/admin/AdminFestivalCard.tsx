"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DeleteFestivalButton } from "@/components/admin/DeleteFestivalButton";
import {
  ExternalLink,
  LayoutDashboard,
  MoreVertical,
  Pencil,
  Trash2,
  Globe,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";
import { AdminEditFestivalModal } from "@/components/admin/AdminEditFestivalModal";
import { AdminEditEditionModal } from "@/components/admin/AdminEditEditionModal";

interface Edition {
  id: string;
  name: string | null;
  number: number;
  slug: string;
  status: "ACTIVE" | "FREEZE" | "ARCHIVED";
  tier: string;
}

interface AdminFestivalCardProps {
  festival: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: Date;
    owner: { email: string };
    editions: Edition[];
  };
}

import { FreezeEditionModal } from "@/components/admin/FreezeEditionModal";

export function AdminFestivalCard({ festival }: AdminFestivalCardProps) {
  const [editFestivalOpen, setEditFestivalOpen] = useState(false);
  const [editEditionId, setEditEditionId] = useState<string | null>(null);
  const [freezeEditionId, setFreezeEditionId] = useState<string | null>(null);

  // Helper to get edition name for the freeze modal
  const getEditionName = (id: string) => {
    const edition = festival.editions.find((e) => e.id === id);
    return edition ? edition.name || `Edition ${edition.number}` : "";
  };

  return (
    <>
      <AdminEditFestivalModal
        open={editFestivalOpen}
        onOpenChange={setEditFestivalOpen}
        festivalId={festival.id}
      />

      <AdminEditEditionModal
        open={!!editEditionId}
        onOpenChange={(open) => !open && setEditEditionId(null)}
        editionId={editEditionId || ""}
      />

      <FreezeEditionModal
        open={!!freezeEditionId}
        onOpenChange={(open) => !open && setFreezeEditionId(null)}
        editionId={freezeEditionId || ""}
        editionName={freezeEditionId ? getEditionName(freezeEditionId) : ""}
      />

      <Card className="flex flex-col h-full bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors group">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold text-white leading-tight">
                {festival.name}
              </CardTitle>
              <Badge
                variant={festival.status === "ACTIVE" ? "default" : "secondary"}
                className="h-5 text-[10px]"
              >
                {festival.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{festival.owner.email}</span>
              <span className="text-slate-600">•</span>
              <span>{format(festival.createdAt, "MMM yyyy")}</span>
            </div>
          </div>

          {/* MENU BUTTON */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 group-hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href={`/festival/${festival.slug}`}
                  className="cursor-pointer"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/${festival.slug}`}
                  target="_blank"
                  className="cursor-pointer"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Visit Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setEditFestivalOpen(true)}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteFestivalButton
                festivalId={festival.id}
                festivalName={festival.name}
                asMenuItem
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="flex-1 space-y-4 pt-2">
          {/* EDITIONS ACCORDION */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="editions" className="border-slate-800">
              <AccordionTrigger className="text-sm text-slate-400 hover:text-white hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Editions ({festival.editions.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pt-2">
                  {festival.editions.length > 0 ? (
                    festival.editions.map((edition) => (
                      <div
                        key={edition.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/50 hover:bg-slate-950 transition-colors group/edition"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">
                              {edition.name || `Edition ${edition.number}`}
                            </span>
                            {edition.status === "ACTIVE" && (
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <span>{edition.tier}</span>
                            <span>•</span>
                            <span
                              className={
                                edition.status === "FREEZE"
                                  ? "text-blue-400 font-bold"
                                  : ""
                              }
                            >
                              {edition.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {edition.status !== "FREEZE" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-500/50 hover:text-blue-400 opacity-0 group-hover/edition:opacity-100 transition-opacity"
                              onClick={() => setFreezeEditionId(edition.id)}
                              title="Freeze Edition"
                            >
                              <div className="h-3 w-3 rounded-full border border-current" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-500 hover:text-white opacity-0 group-hover/edition:opacity-100 transition-opacity"
                            onClick={() => setEditEditionId(edition.id)}
                            title="Edit Edition"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic px-2">
                      No editions found
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
}
