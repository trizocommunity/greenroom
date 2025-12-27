"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateFestival } from "@/hooks/useFestivals";
import { getFestivalAdmin } from "@/server/actions/admin.actions";

const formSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().optional(),
  orgName: z.string().optional(),
  orgWebsite: z.string().optional(),
  establishedYear: z.number().optional(),
  founderName: z.string().optional(),
  founderMessage: z.string().optional(),
});

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
  const updateMutation = useUpdateFestival();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      orgName: "",
      orgWebsite: "",
      establishedYear: undefined,
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
              establishedYear: data.establishedYear || undefined,
              founderName: data.founderName || "",
              founderMessage: data.founderMessage || "",
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, festivalId, form]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateMutation.mutate(
      {
        id: festivalId,
        data: data,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success("Festival updated");
          router.refresh();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Festival (Admin)</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
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
                          <FormLabel>Slug (Subdomain)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="summer-music-fest"
                                className="font-mono text-blue-500 border-blue-500/50 bg-blue-500/10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                            <span className="text-blue-400">
                              https://{field.value || "slug"}.greenroom.com
                            </span>
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
                            placeholder="A short description of the festival..."
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orgName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Org Name</FormLabel>
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
                          <FormLabel>Est. Year</FormLabel>
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
                            placeholder="Welcome message from the founder..."
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

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
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
