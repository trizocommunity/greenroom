"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCreateFestival } from "@/hooks/useFestivals";

const validationSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
});

type FormData = z.infer<typeof validationSchema>;

interface CreateFestivalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFestivalModal({
  open,
  onOpenChange,
}: CreateFestivalModalProps) {
  const createMutation = useCreateFestival();

  const form = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(
      { name: data.name },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Your Festival</DialogTitle>
          <DialogDescription>
            Enter a name for your festival. You can configure editions later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Festival Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Rock Fest" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Festival
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
