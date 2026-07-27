"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdateInstitution } from "@/api/client/profile";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

const updateInstitutionSchema = z.object({
  institutionName: z
    .string()
    .min(2, "Institution name must be at least 2 characters"),
  institutionType: z.string().min(1, "Please select institution type"),
  affiliation: z.string().optional(),
  city: z.string().optional(),
  sizeRange: z.string().optional(),
});

type UpdateInstitutionFormData = z.infer<typeof updateInstitutionSchema>;

interface UpdateInstitutionDialogProps {
  institution: {
    id: string;
    name: string;
    type: string;
    affiliation: string | null;
    city: string | null;
    sizeRange: string | null;
  };
}

const INSTITUTION_TYPES = [
  { value: "COLLEGE", label: "College" },
  { value: "MADRASA", label: "Madrasa" },
  { value: "SCHOOL", label: "School" },
  { value: "UNIVERSITY", label: "University" },
  { value: "INSTITUTION", label: "Institution" },
  { value: "CAMPUS", label: "Campus" },
  { value: "DARS", label: "Dars" },
  { value: "OTHER", label: "Other" },
];

const SIZE_RANGES = [
  { value: "1-100", label: "1-100" },
  { value: "100-500", label: "100-500" },
  { value: "500-2000", label: "500-2000" },
  { value: "2000+", label: "2000+" },
];

export function UpdateInstitutionDialog({
  institution,
}: UpdateInstitutionDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<UpdateInstitutionFormData>({
    resolver: zodResolver(updateInstitutionSchema),
    defaultValues: {
      institutionName: institution.name || "",
      institutionType: institution.type || "",
      affiliation: institution.affiliation || "",
      city: institution.city || "",
      sizeRange: institution.sizeRange || "",
    },
  });

  const { mutate, isPending } = useUpdateInstitution();

  function onSubmit(values: UpdateInstitutionFormData) {
    mutate(values, {
      onSuccess: () => {
        toast.success("Institution updated successfully");
        router.refresh();
        setIsOpen(false);
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to update institution");
      },
    });
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full font-medium border-border hover:bg-muted"
        >
          Update institution
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Update institution</DrawerTitle>
          <DrawerDescription>
            Update your institution details.
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="institutionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Islamic College of Excellence"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="institutionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select institution type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INSTITUTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="affiliation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Affiliation (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Board of Education" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Mumbai" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sizeRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SIZE_RANGES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label} students
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-full font-medium border-border hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full font-medium shadow-primary-glow hover:opacity-90 transition-opacity"
                disabled={
                  !form.formState.isDirty ||
                  !form.formState.isValid ||
                  isPending
                }
              >
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
