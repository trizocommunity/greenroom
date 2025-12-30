"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Globe, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateFestivalInput } from "@/lib/validations/festival";
import { updateFestivalSchema } from "@/lib/validations/festival";
import {
  getFestivalAdmin,
  updateFestivalAdmin,
} from "@/server/actions/admin.actions";

type FormValues = UpdateFestivalInput;

interface AdminEditFestivalModalProps {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminEditFestivalModal({
  festivalId,
  open,
  onOpenChange,
}: AdminEditFestivalModalProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(updateFestivalSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      orgName: "",
      orgWebsite: "",
      orgLocation: "",
      establishedYear: undefined,
      institutionType: undefined,
      institutionName: "",
      location: "",
      founderName: "",
      founderMessage: "",
    },
  });

  useEffect(() => {
    if (open && festivalId) {
      setLoading(true);
      getFestivalAdmin(festivalId)
        .then((data) => {
          if (data) {
            form.reset({
              name: data.name,
              slug: data.slug,
              description: data.description || "",
              orgName: data.orgName || "",
              orgWebsite: data.orgWebsite || "",
              orgLocation: data.orgLocation || "",
              establishedYear: data.establishedYear || undefined,
              institutionType: data.institutionType || undefined,
              institutionName: data.institutionName || "",
              location: data.location || "",
              founderName: data.founderName || "",
              founderMessage: data.founderMessage || "",
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, festivalId, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await updateFestivalAdmin(festivalId, data);
      if (res.success) {
        toast.success("Festival updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        if (res.fields) {
          Object.entries(res.fields).forEach(([key, message]) => {
            form.setError(key as any, { message: message as string });
          });
        } else {
          toast.error(res.error || "Failed to update");
        }
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/40 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wider">
              Super Admin
            </span>
          </div>
          <DialogTitle className="text-xl font-bold mt-2">
            Edit Festival Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col"
            >
              <div className="px-6 py-4">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="w-full justify-start h-12 bg-transparent p-0 border-b rounded-none space-x-6">
                    <TabsTrigger
                      value="general"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                    >
                      General Info
                    </TabsTrigger>
                    <TabsTrigger
                      value="online"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                    >
                      Online Presence
                    </TabsTrigger>
                    <TabsTrigger
                      value="organization"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                    >
                      Organization
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6 space-y-6">
                    {/* General Tab */}
                    <TabsContent value="general" className="space-y-6 mt-0">
                      <div className="bg-muted/30 p-4 rounded-xl border space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Basic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Festival Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="E.g. Summer Arts 2025"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Briefly describe your festival..."
                                    className="resize-none min-h-[100px]"
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
                      <div className="bg-muted/30 p-4 rounded-xl border space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          Founder Details
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
                                    placeholder="John Doe"
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
                            name="founderMessage"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Founder message..."
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
                    </TabsContent>

                    {/* Online Presence Tab - Subdomain */}
                    <TabsContent value="online" className="space-y-6 mt-0">
                      <div className="bg-linear-to-br from-primary/5 to-transparent p-6 rounded-xl border border-primary/20 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <Globe className="w-6 h-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-lg">
                              Festival Subdomain
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Manage the unique subdomain.
                            </p>
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subdomain</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <div className="relative flex-1">
                                    <Input
                                      placeholder="my-festival"
                                      {...field}
                                      className="font-mono pl-4 pr-32"
                                      value={field.value || ""}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground bg-muted/50 border-l px-3 rounded-r-md">
                                      .greenroom.com
                                    </div>
                                  </div>
                                </FormControl>
                              </div>
                              <FormDescription>
                                Only lowercase letters, numbers, and hyphens are
                                allowed.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="bg-background/50 p-3 rounded-lg border text-sm flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Preview:
                          </span>
                          <a
                            href={`https://${form.watch("slug") || "your-festival"}.greenroom.com`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-primary hover:underline"
                          >
                            https://{form.watch("slug") || "your-festival"}
                            .greenroom.com
                          </a>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Organization Tab */}
                    <TabsContent
                      value="organization"
                      className="space-y-6 mt-0"
                    >
                      <div className="bg-muted/30 p-4 rounded-xl border space-y-4">
                        <h3 className="font-semibold">Organization Info</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="orgName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Org Name"
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
                            name="orgWebsite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Website</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://..."
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
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="px-6 py-4 bg-muted/40 border-t sticky bottom-0 backdrop-blur-md flex justify-end gap-3">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
