"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { updateFestivalAction } from "@/server/actions/user-festival.actions";
import { updateFestivalSchema } from "@/lib/validations/festival";
import type { UpdateFestivalInput } from "@/lib/validations/festival";
import { InstitutionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface EditFestivalModalProps {
  festival: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = UpdateFestivalInput;

export function EditFestivalModal({
  festival,
  open,
  onOpenChange,
}: EditFestivalModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(updateFestivalSchema),
    defaultValues: {
      name: festival?.name || "",
      description: festival?.description || "",
      orgName: festival?.orgName || "",
      orgDescription: festival?.orgDescription || "",
      orgWebsite: festival?.orgWebsite || "",
      orgLocation: festival?.orgLocation || "",
      establishedYear: festival?.establishedYear || null,
      institutionType: festival?.institutionType || null,
      institutionName: festival?.institutionName || "",
      location: festival?.location || "",
      founderName: festival?.founderName || "",
      founderMessage: festival?.founderMessage || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await updateFestivalAction(values);
      if (res.success) {
        toast.success("Festival updated successfully");
        queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
        onOpenChange(false);
      } else {
        toast.error("Error", { description: res.error });
      }
      router.refresh();
    } catch (error: any) {
      toast.error("Error", { description: "Failed to update festival" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Festival Details</DialogTitle>
          <DialogDescription>
            Update your festival information and organizational details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold text-lg border-b pb-2">
                  Basic Information
                </h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Festival Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Summer Arts 2025" {...field} />
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
                          placeholder="Briefly describe your festival..."
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Organization Info */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold text-lg border-b pb-2 pt-4">
                  Organization Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orgName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Name of your org"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="establishedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Established Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="YYYY"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(e.target.valueAsNumber || null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="orgWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Website</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orgLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City, Country"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Institution Info */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold text-lg border-b pb-2 pt-4">
                  Institution Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="institutionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={InstitutionType.COLLEGE}>
                              College
                            </SelectItem>
                            <SelectItem value={InstitutionType.SCHOOL}>
                              School
                            </SelectItem>
                            <SelectItem value={InstitutionType.MADRASA}>
                              Madrasa
                            </SelectItem>
                            <SelectItem value={InstitutionType.OTHER}>
                              Other
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="institutionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Name of institution"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Founder Message */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold text-lg border-b pb-2 pt-4">
                  Founder Message
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="founderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Founder Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Founder's Name"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Festival Venue/Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Venue location"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="founderMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founder Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A message from the founder..."
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
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
