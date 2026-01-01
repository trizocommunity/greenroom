"use client";

import { format } from "date-fns";
import {
  Calendar,
  Globe,
  LayoutDashboard,
  MoreVertical,
  Pencil,
  Scale,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminEditFestivalModal } from "@/components/admin/AdminEditFestivalModal";
import { DeleteFestivalButton } from "@/components/admin/DeleteFestivalButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminFestivalCardProps {
  festival: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string | Date;
    owner: { email: string };
    studentsCount?: number;
    eventsCount?: number;
    judgesCount?: number;
  };
}

export function AdminFestivalCard({ festival }: AdminFestivalCardProps) {
  const [editFestivalOpen, setEditFestivalOpen] = useState(false);

  return (
    <>
      <AdminEditFestivalModal
        open={editFestivalOpen}
        onOpenChange={setEditFestivalOpen}
        festivalId={festival.id}
      />

      <Card className="relative group overflow-hidden border-none shadow-xl bg-background/50 backdrop-blur-sm ring-1 ring-border/50 transition-all duration-500 hover:shadow-2xl hover:ring-primary/20 flex flex-col h-full">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-80" />

        <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={festival.status === "ACTIVE" ? "default" : "secondary"}
                className={
                  festival.status === "ACTIVE"
                    ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 px-2 h-5 text-[10px] font-black uppercase tracking-wider"
                    : "px-2 h-5 text-[10px] font-black uppercase tracking-wider"
                }
              >
                {festival.status}
              </Badge>
              <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(festival.createdAt), "MMM yyyy")}
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 truncate pr-2">
              {festival.name}
            </CardTitle>
            <div className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              {festival.owner.email}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground shadow-sm transition-all duration-300"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <DropdownMenuLabel className="text-xs uppercase tracking-widest font-black text-muted-foreground/60 px-2 py-1.5">
                Festival Controls
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href={`/festival/${festival.slug}`}
                  className="rounded-md cursor-pointer"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Open Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/${festival.slug}`}
                  target="_blank"
                  className="rounded-md cursor-pointer"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  View Public Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setEditFestivalOpen(true)}
                className="rounded-md cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Quick Edit
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

        <CardContent className="relative space-y-4 pb-6 mt-auto">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
              <Users className="w-4 h-4 mx-auto text-primary/60" />
              <div className="text-lg font-black leading-none">
                {festival.studentsCount || 0}
              </div>
              <div className="text-[9px] uppercase tracking-tighter font-bold text-muted-foreground/60">
                Students
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
              <Trophy className="w-4 h-4 mx-auto text-primary/60" />
              <div className="text-lg font-black leading-none">
                {festival.eventsCount || 0}
              </div>
              <div className="text-[9px] uppercase tracking-tighter font-bold text-muted-foreground/60">
                Events
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
              <Scale className="w-4 h-4 mx-auto text-primary/60" />
              <div className="text-lg font-black leading-none">
                {festival.judgesCount || 0}
              </div>
              <div className="text-[9px] uppercase tracking-tighter font-bold text-muted-foreground/60">
                Judges
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
