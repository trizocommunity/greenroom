"use client";

import { format } from "date-fns";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ViewDetailsDialogProps {
  title: string;
  description?: string;
  data: Record<string, any>;
  type?: "default" | "audit";
}

export function ViewDetailsDialog({
  title,
  description,
  data,
  type: _type = "default",
}: ViewDetailsDialogProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View Details</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-6 py-4">
            {Object.entries(data).map(([key, value]) => {
              if (value === null || value === undefined) return null;

              // Hide sensible fields regarding password
              if (key === "password" || key === "passwordHash") return null;

              if (
                key === "metadata" ||
                key === "branding" ||
                (typeof value === "object" &&
                  value !== null &&
                  !Array.isArray(value) &&
                  !(value instanceof Date))
              ) {
                // JSON / Object handling
                return (
                  <div key={key} className="space-y-2">
                    <h4 className="text-sm font-medium leading-none capitalize tracking-tight text-muted-foreground">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </h4>
                    <div className="rounded-md border bg-muted/50 p-3 font-mono text-xs overflow-auto max-h-60">
                      <pre className="whitespace-pre-wrap wrap-break-word">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start pb-4 border-b last:border-0 last:pb-0"
                >
                  <h4 className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </h4>
                  <div className="sm:col-span-2 text-sm font-medium wrap-break-word">
                    {formatValue(key, value)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

function formatValue(key: string, value: any): React.ReactNode {
  if (
    value instanceof Date ||
    (typeof value === "string" &&
      !Number.isNaN(Date.parse(value)) &&
      key.toLowerCase().includes("date")) ||
    key.toLowerCase().includes("at")
  ) {
    try {
      return format(new Date(value), "MMM d, yyyy HH:mm:ss");
    } catch (e) {
      return String(value);
    }
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (key === "currency") {
    return <span className="font-mono">{String(value).toUpperCase()}</span>;
  }

  return String(value);
}
