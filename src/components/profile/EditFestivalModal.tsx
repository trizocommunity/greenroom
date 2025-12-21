"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { type Festival, useUpdateFestival } from "@/hooks/useFestivals";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
});

type FormData = z.infer<typeof formSchema>;

interface EditFestivalModalProps {
  festival: Festival | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFestivalModal({
  festival,
  open,
  onOpenChange,
}: EditFestivalModalProps) {
  const updateMutation = useUpdateFestival();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  useEffect(() => {
    if (festival && open) {
      form.reset({
        name: festival.name,
        slug: festival.slug || "",
      });
    }
  }, [festival, open, form]);

  const onSubmit = (data: FormData) => {
    if (!festival) return;

    updateMutation.mutate(
      {
        id: festival.id,
        data: {
          name: data.name,
          slug: data.slug,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  if (!festival) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Festival Details</DialogTitle>
          <DialogDescription>
            Update your festival name and URL slug.
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
                    <Input placeholder="Summer Music Festival" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="summer-music-fest" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    URL: {field.value}.greenrooom.com
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
