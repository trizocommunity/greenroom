"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEditionAction } from "@/server/actions/edition.actions";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

export function CreateEditionForm({ festivalId }: { festivalId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createEditionAction(formData);
      if (result?.error) {
        if (typeof result.error === "string") {
          setError(result.error);
        } else {
          // Simple handling for field errors for now
          setError("Please check your inputs.");
        }
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Edition Details</CardTitle>
      </CardHeader>
      <form action={onSubmit}>
        <input type="hidden" name="festivalId" value={festivalId} />
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="slug">Edition Slug</Label>
            <Input
              id="slug"
              name="slug"
              placeholder="e.g. edition-2024"
              required
            />
            <p className="text-[0.8rem] text-muted-foreground">
              The slug is used as the edition name and must be unique.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              name="year"
              type="number"
              defaultValue={new Date().getFullYear()}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Edition
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
