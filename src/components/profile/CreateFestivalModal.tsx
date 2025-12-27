import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFestival } from "@/server/actions/festival.actions";
import {
  createFestivalSchema,
  type CreateFestivalInput,
} from "@/lib/validations/festival";
import { InstitutionType } from "@prisma/client";

type FormData = CreateFestivalInput;

interface CreateFestivalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
}

export function CreateFestivalModal({
  open,
  onOpenChange,
  paymentId,
}: CreateFestivalModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(createFestivalSchema),
    defaultValues: {
      paymentId,
      festivalName: "",
      festivalSlug: "",
      description: "",
      institutionName: "",
      institutionType: undefined,
      location: "",
    },
  });

  const { setValue, watch } = form;
  const festivalName = watch("festivalName");
  const festivalSlug = watch("festivalSlug");

  // Auto-generate slug from name if user hasn't manually edited it
  // We can track manual edits by checking if the slug matches the derived name slug
  // or simply auto-update until the user focuses/changes the slug field.
  // A simpler approach: use a state to track "isDirty" for slug?
  // Or just update if the current slug is effectively the "default" version of the previous name?
  // Let's use form.formState.dirtyFields.festivalSlug.

  // Actually, we can just use an effect that updates it if the field isn't dirty.
  // But react-hook-form's dirty state might be tricky if we programmatically set value.
  // Instead, let's just update prompt user to verify.
  // Or: Just let user edit manually. If empty, we can auto-fill on blur of name?
  // Let's go with: Update generated slug AS LONG AS `festivalSlug` field hasn't been explicitly touched/modified by user.

  // However, specifically requested: "give already have slug ... user need only changes the slug"
  // So we just default it.

  // Let's just listen to festivalName changes
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (festivalName && !isSlugManuallyEdited) {
      const generated = festivalName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setValue("festivalSlug", generated, { shouldValidate: true });
    }
  }, [festivalName, setValue, isSlugManuallyEdited]);

  const onSubmit = async (data: FormData) => {
    try {
      // Use the slug from the form data (it should be populated now)
      const slug =
        data.festivalSlug ||
        data.festivalName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      const result = await createFestival({
        ...data,
        festivalSlug: slug,
        paymentId,
      });

      if (result.success) {
        toast.success("Festival Created Successfully!");
        queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
        form.reset();
        setIsSlugManuallyEdited(false); // Reset state
        onOpenChange(false);
        // Redirect to festival dashboard
        if (result.data?.slug) {
          router.push(`/festival/${result.data.slug}`);
        }
      } else {
        if (result.fields) {
          if (result.fields.slug || result.fields.festivalSlug) {
            // Now we can show error on the actual slug field
            form.setError("festivalSlug", {
              message:
                "This subdomain is already taken. Please choose another.",
            });
            return;
          }
          // Generic field errors
          Object.entries(result.fields).forEach(([key, message]) => {
            if (key === "slug") return;
            form.setError(key as any, { message: message as string });
          });
          return;
        }
        toast.error(result.error || "Failed to create festival");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Launch Your Festival</DialogTitle>
          <DialogDescription>
            Set up your festival details. You have 40 days of access.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="festivalName"
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

              <FormField
                control={form.control}
                name="festivalSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Festival Subdomain</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input
                            placeholder="summer-rock-fest"
                            {...field}
                            className="font-mono pr-32"
                            onChange={(e) => {
                              field.onChange(e);
                              setIsSlugManuallyEdited(true);
                            }}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground bg-muted/50 border-l px-3 rounded-r-md">
                            .greenroom.com
                          </div>
                        </div>
                      </FormControl>
                    </div>
                    <FormDescription>
                      This will be your unique URL. You can change it now.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your festival..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Launch Festival
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
