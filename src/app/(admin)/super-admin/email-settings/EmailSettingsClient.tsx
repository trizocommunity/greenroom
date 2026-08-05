"use client";

import { Loader2, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/toast";
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
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
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
  );
}
