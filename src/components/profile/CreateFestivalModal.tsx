import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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

  const onSubmit = async (data: FormData) => {
    try {
      // Auto-generate slug if empty
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

      if (result.success && result.data) {
        toast.success("Festival Created Successfully!");
        queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
        form.reset();
        onOpenChange(false);
        // Redirect to festival dashboard
        if (result.data.slug) {
          router.push(`/festival/${result.data.slug}`);
        }
      } else {
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

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Subdomain Preview
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-primary font-semibold">
                    {form.watch("festivalName")
                      ? form
                          .watch("festivalName")
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "")
                      : "my-festival"}
                  </span>
                  <span className="text-muted-foreground">.greenroom.com</span>
                </div>
              </div>

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
