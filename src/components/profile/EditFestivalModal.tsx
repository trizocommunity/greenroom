"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { type Festival, useUpdateFestival } from "@/hooks/useFestivals";

import {
  type FestivalFormData,
  type FestivalStep1Data,
  type FestivalStep2Data,
  festivalSchema,
  festivalStep1Schema,
  festivalStep2Schema,
} from "@/lib/validations/festival";

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
  const [step, setStep] = useState(1);
  const [step1Data, setFestivalStep1Data] = useState<FestivalStep1Data | null>(
    null,
  );
  const updateMutation = useUpdateFestival();

  const step1Form = useForm<FestivalStep1Data>({
    resolver: zodResolver(festivalStep1Schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
    },
  });

  const step2Form = useForm<FestivalStep2Data>({
    resolver: zodResolver(festivalStep2Schema),
    defaultValues: {
      orgName: "",
      orgDescription: "",
      orgWebsite: "",
      orgLocation: "",
      orgEstablishedYear: "",
    },
  });

  // Load festival data when modal opens
  useEffect(() => {
    if (festival && open) {
      // Format dates for input type="date"
      const startDate = new Date(festival.startDate)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(festival.endDate).toISOString().split("T")[0];

      step1Form.reset({
        name: festival.name,
        slug: festival.slug || "",
        description: festival.description || "",
        startDate,
        endDate,
        location: festival.location,
      });

      step2Form.reset({
        orgName: festival.orgName,
        orgDescription: festival.orgDescription || "",
        orgWebsite: festival.orgWebsite || "",
        orgLocation: festival.orgLocation || "",
        orgEstablishedYear: festival.orgEstablishedYear
          ? String(festival.orgEstablishedYear)
          : "",
      });

      setStep(1);
      setFestivalStep1Data(null);
    }
  }, [festival, open, step1Form, step2Form]);

  const handleStep1Submit = (data: FestivalStep1Data) => {
    // Validate date range
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      step1Form.setError("endDate", {
        message: "End date must be after start date",
      });
      return;
    }
    setFestivalStep1Data(data);
    setStep(2);
  };

  const handleStep2Submit = async (data: FestivalStep2Data) => {
    if (!step1Data || !festival) return;

    const fullData: FestivalFormData = {
      ...step1Data,
      ...data,
    };

    updateMutation.mutate(
      {
        id: festival.id,
        data: {
          name: fullData.name,
          slug: fullData.slug,
          description: fullData.description || undefined,
          startDate: fullData.startDate,
          endDate: fullData.endDate,
          location: fullData.location,
          orgName: fullData.orgName,
          orgDescription: fullData.orgDescription || undefined,
          orgWebsite: fullData.orgWebsite || undefined,
          orgLocation: fullData.orgLocation || undefined,
          orgEstablishedYear: fullData.orgEstablishedYear
            ? parseInt(fullData.orgEstablishedYear)
            : undefined,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setFestivalStep1Data(null);
    }, 300);
  };

  const handleBack = () => {
    setStep(1);
  };

  if (!festival) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Festival</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Step 1 of 2: Festival Information"
              : "Step 2 of 2: Organization Details"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`h-2 flex-1 rounded-full ${
              step >= 1 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-2 flex-1 rounded-full ${
              step >= 2 ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>

        {step === 1 && (
          <Form {...step1Form}>
            <form
              onSubmit={step1Form.handleSubmit(handleStep1Submit)}
              className="space-y-4"
            >
              <FormField
                control={step1Form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Festival Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Music Festival" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step1Form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="summer-music-fest"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "-"),
                          )
                        }
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Your festival URL: {field.value || "your-slug"}
                      .greenrooom.com
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step1Form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your festival..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={step1Form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={step1Form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={step1Form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...step2Form}>
            <form
              onSubmit={step2Form.handleSubmit(handleStep2Submit)}
              className="space-y-4"
            >
              <div className="pb-2 border-b">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Organization / College / Madrasa Details
                </h4>
              </div>

              <FormField
                control={step2Form.control}
                name="orgName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="University of Arts" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step2Form.control}
                name="orgDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="About the organization..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={step2Form.control}
                  name="orgWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={step2Form.control}
                  name="orgEstablishedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Established Since</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1990"
                          min="1800"
                          max={new Date().getFullYear()}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={step2Form.control}
                name="orgLocation"
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

              <div className="flex justify-between gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
