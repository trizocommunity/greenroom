import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  actionLink: string;
  icon: LucideIcon;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionLink,
  icon: Icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full flex-grow min-h-[60vh] p-8 animate-in fade-in-50">
      <Card className="w-full max-w-md text-center border-dashed border-2">
        <CardContent className="pt-10 pb-10 space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-muted">
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <Button asChild>
            <Link href={actionLink}>{actionLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
