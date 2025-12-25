"use client";

import { useRouter, usePathname } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Festival, useUpdateFestival } from "@/hooks/useFestivals";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().optional(),
  orgName: z.string().optional(),
  orgDescription: z.string().optional(),
  orgWebsite: z.string().url("Invalid URL").optional().or(z.literal("")),
  establishedYear: z.number().optional(),
  founderName: z.string().optional(),
  founderMessage: z.string().optional(),
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
  const router = useRouter();
  const pathname = usePathname();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      orgName: "",
      orgDescription: "",
      orgWebsite: "",
      establishedYear: undefined,
      founderName: "",
      founderMessage: "",
    },
  });

  useEffect(() => {
    if (festival && open) {
      form.reset({
        name: festival.name,
        slug: festival.slug || "",
        description: festival.description || "",
        orgName: festival.orgName || "",
        orgDescription: festival.orgDescription || "",
        orgWebsite: festival.orgWebsite || "",
        establishedYear: festival.establishedYear || undefined,
        founderName: festival.founderName || "",
        founderMessage: festival.founderMessage || "",
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
          description: data.description,
          orgName: data.orgName,
          orgDescription: data.orgDescription,
          orgWebsite: data.orgWebsite,
          establishedYear: data.establishedYear,
          founderName: data.founderName,
          founderMessage: data.founderMessage,
        },
      },
      {
        onSuccess: (updatedFestival) => {
          onOpenChange(false);
          toast.success("Festival updated successfully");

          if (
            updatedFestival?.slug &&
            festival.slug &&
            updatedFestival.slug !== festival.slug
          ) {
            // Check if we are on a path that includes the old slug
            // Example: /festival/old-slug/settings -> /festival/new-slug/settings
            // Example: /festival/old-slug -> /festival/new-slug
            if (pathname.includes(festival.slug)) {
              const newPath = pathname.replace(
                festival.slug,
                updatedFestival.slug,
              );
              router.push(newPath);
            } else {
              router.refresh();
            }
          } else {
            router.refresh();
          }
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
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="organization">Organization</TabsTrigger>
                <TabsTrigger value="founder">Founder</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Festival Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Summer Music Festival"
                            {...field}
                          />
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
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A short description of your festival"
                          className="h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Organization Tab */}
              <TabsContent value="organization" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orgName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization/College Name</FormLabel>
                        <FormControl>
                          <Input placeholder="State University" {...field} />
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
                            placeholder="1990"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : undefined,
                              )
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
                  name="orgDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your organization..."
                          className="h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orgWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://university.edu"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Founder Tab */}
              <TabsContent value="founder" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="founderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="founderMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founder Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Welcome to our annual event..."
                          className="h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

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
