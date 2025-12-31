"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useFestival } from "@/components/festival/FestivalContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudentAction } from "@/server/actions/student.actions";

export function AddStudentForm() {
  const festival = useFestival();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!festival) return null;

  const currentCount = festival.studentsCount || 0;
  const maxStudents = festival.limits?.maxStudents || 1000;
  const isFull = currentCount >= maxStudents;

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createStudentAction(formData);
      if (result.error) {
        if (typeof result.error === "string") {
          setError(result.error);
        } else {
          setError("Please check your inputs.");
        }
      } else {
        toast.success("Student registered successfully.");
      }
    });
  }

  if (isFull) {
    return (
      <Alert variant="destructive">
        <UserPlus className="h-4 w-4" />
        <AlertTitle>Registration Closed</AlertTitle>
        <AlertDescription>
          This festival has reached its student limit ({maxStudents}).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="festivalId" value={festival.id} />

      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" name="name" required placeholder="John Doe" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="john@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number (Optional)</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1234567890" />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Registering...
          </>
        ) : (
          "Register Student"
        )}
      </Button>
    </form>
  );
}
