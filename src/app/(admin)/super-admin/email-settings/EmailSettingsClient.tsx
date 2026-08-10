"use client";

import { Loader2, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { toast } from "@/lib/toast";

type Item = {
  kind: string;
  label: string;
  description: string;
  enabled: boolean;
};

export function EmailSettingsClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pendingKind, setPendingKind] = useState<string | null>(null);

  const handleToggle = async (kind: string, currentEnabled: boolean) => {
    setPendingKind(kind);
    try {
      const res = await apiClient.post("/super-admin/email-settings", {
        updates: [{ kind, enabled: !currentEnabled }],
      });
      await handleApiResponse(res.data);
      toast.success(`${kind}: ${!currentEnabled ? "On" : "Off"}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setPendingKind(null);
    }
  };

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((item) => {
          const isPending = pendingKind === item.kind;
          return (
            <div
              key={item.kind}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="space-y-1">
                <div className="font-medium text-sm">{item.label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
              <Button
                variant={item.enabled ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggle(item.kind, item.enabled)}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Power className="w-4 h-4 mr-1" />
                )}
                {item.enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Email kind</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="text-center font-semibold w-[160px]">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isPending = pendingKind === item.kind;
              return (
                <TableRow key={item.kind}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant={item.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggle(item.kind, item.enabled)}
                      disabled={isPending}
                      className="min-w-[100px]"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4 mr-1" />
                      )}
                      {item.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
