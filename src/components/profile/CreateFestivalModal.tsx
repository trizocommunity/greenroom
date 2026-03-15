"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InstitutionType } from "@/lib/prisma-enums";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  FormDescription,
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
import { queryKeys } from "@/lib/query-keys";
import {
  type CreateFestivalInput,
  createFestivalSchema,
} from "@/lib/validations/festival";
import { createFestival } from "@/server/actions/festival.actions";

type FormData = Omit<CreateFestivalInput, "startDate" | "endDate"> & {
  startDate?: string | Date;
  endDate?: string | Date;
};

interface CreateFestivalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  tier?: string;
}

export function CreateFestivalModal({
  open,
  onOpenChange,
  paymentId,
  tier: _tier,
}: CreateFestivalModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(createFestivalSchema) as any,
    defaultValues: {
      paymentId,
      festivalName: "",
      festivalSlug: "",
      description: "",
      institutionName: "",
      institutionType: undefined,
      location: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  const { setValue, watch } = form;
  const festivalName = watch("festivalName");
  const festivalSlug = watch("festivalSlug");

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
      const slug =
        data.festivalSlug ||
        data.festivalName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      // Ensure dates are Dates if they are strings (zod resolver handles this usually but let's be safe)
      // Actually createsFestival expects CreateFestivalInput where startDate is Date.
      // But data has string | Date.
      // Zod parser in backend will handle coercion too if we used coerce in backend validation?
      // No, we used coerce in Frontend validation.
      // So 'data' coming out of handleSubmit is actually the RESULT of validation, so it SHOULD be Dates.
      // But Typescript 'FormData' override says string | Date.
      // We can cast `data` to `CreateFestivalInput`.

      const validData = data as CreateFestivalInput;

      const result = await createFestival({
        ...validData,
        festivalSlug: slug,
        paymentId,
      });

      if (result.success) {
        toast.success("Festival Created Successfully!");
        queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
        form.reset();
        setIsSlugManuallyEdited(false);
        onOpenChange(false);
        if (result.data?.slug) {
          router.push(`/dashboard/${result.data.slug}`);
        }
      } else {
        const errorResult = result as any;
        if (errorResult.fields) {
          if (errorResult.fields.slug || errorResult.fields.festivalSlug) {
            form.setError("festivalSlug", {
              message:
                "This subdomain is already taken. Please choose another.",
            });
            return;
          }
          Object.entries(errorResult.fields).forEach(([key, message]) => {
            if (key === "slug") return;
            form.setError(key as any, { message: message as string });
          });
          return;
        }
        toast.error(errorResult.error || "Failed to create festival");
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={
                            field.value instanceof Date
                              ? field.value.toISOString().split("T")[0]
                              : typeof field.value === "string"
                                ? field.value
                                : ""
                          }
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={
                            field.value instanceof Date
                              ? field.value.toISOString().split("T")[0]
                              : typeof field.value === "string"
                                ? field.value
                                : ""
                          }
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
