"use client";

import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryKeys } from "@/api/client/_query-keys";
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
import { upgradeToInstitutionalAction } from "@/features/institutions/actions/institution-upgrade.actions";
import { toast } from "@/lib/toast";

const upgradeSchema = z.object({
  institutionName: z
    .string()
    .min(2, "Institution name must be at least 2 characters"),
  institutionType: z.string().min(1, "Please select institution type"),
  affiliation: z.string().optional(),
  city: z.string().optional(),
  sizeRange: z.string().optional(),
});

type UpgradeFormData = z.infer<typeof upgradeSchema>;

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

/**
 * Personal → institutional upgrade. The only route to a custom domain for
 * someone who onboarded as a personal account: domains live on `institution`,
 * and a personal account has none.
 *
 * The action also adopts the festivals this user already owns, so an existing
 * PRO festival gains its Custom subdomain section the moment this succeeds.
 */
export function UpgradeToInstitutionalDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpgradeFormData>({
    resolver: zodResolver(upgradeSchema),
    // Fields start empty here (unlike the edit dialogs, which prefill), so the
    // submit gate below needs `isValid` to track as the user types.
    mode: "onChange",
    defaultValues: {
      institutionName: "",
      institutionType: "",
      affiliation: "",
      city: "",
      sizeRange: "",
    },
  });

  function onSubmit(values: UpgradeFormData) {
    startTransition(async () => {
      const result = await upgradeToInstitutionalAction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const { linkedFestivals } = result.data;
      toast.success(
        linkedFestivals > 0
          ? `Account upgraded. ${linkedFestivals} festival${
              linkedFestivals === 1 ? "" : "s"
            } now branded under ${values.institutionName}.`
          : "Account upgraded to institutional.",
      );

      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      router.refresh();
      setIsOpen(false);
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
          <Building2 className="mr-2 h-4 w-4" />
          Upgrade to institutional
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Upgrade to institutional</DrawerTitle>
          <DrawerDescription>
            Add your institution to unlock custom domains and campus features.
            Festivals you already own move under it automatically.
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
                          {size.label} participants
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
                disabled={!form.formState.isValid || isPending}
              >
                {isPending ? "Upgrading..." : "Upgrade account"}
              </Button>
            </div>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
