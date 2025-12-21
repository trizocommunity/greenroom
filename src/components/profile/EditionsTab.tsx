"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock } from "lucide-react";

export function EditionsTab() {
  return (
    <div className="space-y-6">
      <Card className="border-dashed bg-muted/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle>Editions are Locked</CardTitle>
          <CardDescription>
            You need to unlock your festival to create editions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button disabled variant="secondary">
            Create First Edition (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
