"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function FestivalCardSkeleton() {
  return (
    <Card className="overflow-hidden border-none shadow-xl bg-background/50 backdrop-blur-sm ring-1 ring-border/50">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 flex-1 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function BillingHistorySkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-transparent"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminStatsSkeleton() {
  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
