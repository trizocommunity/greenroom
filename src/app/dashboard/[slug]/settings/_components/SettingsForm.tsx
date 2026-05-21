"use client";

import { format } from "date-fns";
import {
  Building2,
  Calendar,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Palette,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { uploadImageToCloudinary } from "@/core/integrations/cloudinary";
import { cn } from "@/core/utils/cn";
import { parseStoredInstant, toDateOrNull } from "@/core/utils/date-time";
import {
  updateFestivalBrandingAction,
  updateFestivalSettingsAction,
} from "@/features/festivals/actions/festival-crud.actions";
import { updateFestivalAction } from "@/features/festivals/actions/user-festival.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { FeatureService } from "@/features/plan-features/services/features";
import { getResolvedTier } from "@/features/plan-features/services/tier";

interface SettingsFormProps {
  festival: any;
}

function serializeSettingsFormData(formData: {
  name: string;
  description: string;
  slug: string;
  location: string;
  startDate: Date | null;
  endDate: Date | null;
  orgName: string;
  orgDescription: string;
  orgWebsite: string;
  orgLocation: string;
  logo: string;
  programmeAssignmentDeadline: string;
  teamLeaderLimit: number;
}) {
  return JSON.stringify({
    ...formData,
    startDate: formData.startDate ? formData.startDate.toISOString() : null,
    endDate: formData.endDate ? formData.endDate.toISOString() : null,
  });
}

export function SettingsForm({ festival }: SettingsFormProps) {
  const dirtySourceId = `festival-settings:${festival.id}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { isReadOnly } = useFestivalReadOnly();
  const resolvedTier = getResolvedTier(festival.tier);
  const isBasic = resolvedTier === "BASIC";

  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingFestival, setIsSavingFestival] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // State for all settings
  const [formData, setFormData] = useState({
    // Basics
    name: festival.name || "",
    description: festival.description || "",
    slug: festival.slug || "",
    location: festival.location || "",
    startDate: toDateOrNull(festival.startDate),
    endDate: toDateOrNull(festival.endDate),

    // Organization
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",

    // Branding
    logo: festival.branding?.logo || "",

    // Configuration
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline
      ? parseStoredInstant(festival.programmeAssignmentDeadline).toISOString()
      : "",
    teamLeaderLimit: Number(festival.teamLeaderLimit ?? 2),
  });
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    serializeSettingsFormData({
      name: festival.name || "",
      description: festival.description || "",
      slug: festival.slug || "",
      location: festival.location || "",
      startDate: toDateOrNull(festival.startDate),
      endDate: toDateOrNull(festival.endDate),
      orgName: festival.orgName || "",
      orgDescription: festival.orgDescription || "",
      orgWebsite: festival.orgWebsite || "",
      orgLocation: festival.orgLocation || "",
      logo: festival.branding?.logo || "",
      programmeAssignmentDeadline: festival.programmeAssignmentDeadline
        ? parseStoredInstant(festival.programmeAssignmentDeadline).toISOString()
        : "",
      teamLeaderLimit: Number(festival.teamLeaderLimit ?? 2),
    }),
  );
  const hasChanges = useMemo(
    () => serializeSettingsFormData(formData) !== savedSnapshot,
    [formData, savedSnapshot],
  );

  const durationStart = useMemo(() => {
    const createdAt = toDateOrNull(festival?.createdAt);
    return createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt
      : new Date();
  }, [festival?.createdAt]);

  const festivalStartDate = useMemo(() => {
    if (!formData.startDate) return null;
    const d = new Date(formData.startDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [formData.startDate]);

  const festivalHasStarted = useMemo(() => {
    if (!festivalStartDate) return false;
    return new Date() >= festivalStartDate;
  }, [festivalStartDate]);

  const validateDateWindow = () => {
    if (!formData.startDate || !formData.endDate) {
      toast.error("Please select valid start and end dates.");
      return false;
    }
    if (formData.startDate > formData.endDate) {
      toast.error("Start date must be before end date.");
      return false;
    }
    return true;
  };

  const uploadToCloudinary = async (file: File) => {
    setLogoError(null);

    // Validate File Type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      const msg = "Invalid file type. Please upload a PNG, JPG, or SVG.";
      setLogoError(msg);
      toast.error(msg);
      return null;
    }

    // Validate File Size
    const maxSizeBytes = 1 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const msg = "Logo is too large. Maximum size is 1MB.";
      setLogoError(msg);
      toast.error(msg);
      return null;
    }

    const url = await uploadImageToCloudinary(file, "logo");
    if (!url) {
      // Specific error already handled in cloudinary helper, but we set a generic one if needed
      return null;
    }
    return url;
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    try {
      // Save Organization details via updateFestivalAction
      const orgRes = await updateFestivalAction(festival.id, {
        orgName: formData.orgName,
        orgDescription: formData.orgDescription,
        orgWebsite: formData.orgWebsite,
        orgLocation: formData.orgLocation,
        slug: formData.slug,
      });

      // Save Branding
      const brandingRes = await updateFestivalBrandingAction({
        festivalId: festival.id,
        logo: formData.logo || null,
      });

      if (orgRes.success && brandingRes.success) {
        setSavedSnapshot(serializeSettingsFormData(formData));
        setDirty(dirtySourceId, false);
        toast.success("General settings updated");
        router.refresh();
      } else {
        toast.error("Failed to update some settings");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSaveFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFestival(true);
    try {
      if (!validateDateWindow()) return;

      // 1. Save Basics (Name, Dates, Location, Slug)
      const basicsRes = await updateFestivalAction(festival.id, {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        slug: formData.slug,
      });

      // 2. Save Configuration (Deadlines, Limits)
      const configRes = await updateFestivalSettingsAction(festival.id, {
        programmeAssignmentDeadline:
          formData.programmeAssignmentDeadline || null,
        teamLeaderLimit: formData.teamLeaderLimit,
      });

      if (basicsRes.success && configRes.success) {
        setSavedSnapshot(serializeSettingsFormData(formData));
        setDirty(dirtySourceId, false);
        toast.success("Festival settings updated");
        router.refresh();
      } else {
        toast.error("Failed to update festival settings");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSavingFestival(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const url = await uploadToCloudinary(file);
    if (url) {
      setFormData({ ...formData, logo: url });
      toast.success("Logo uploaded successfully");
    }
    setUploadingLogo(false);
    // Reset input
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: "" });
    toast.info("Logo removed. Save to apply changes.");
  };

  useEffect(() => {
    registerDirtySource(dirtySourceId);
    return () => unregisterDirtySource(dirtySourceId);
  }, [dirtySourceId, registerDirtySource, unregisterDirtySource]);

  useEffect(() => {
    if (isReadOnly) {
      setDirty(dirtySourceId, false);
      return;
    }
    setDirty(dirtySourceId, hasChanges);
  }, [dirtySourceId, hasChanges, isReadOnly, setDirty]);

  return (
    <Tabs defaultValue={isBasic ? "festival" : "general"} className="space-y-6">
      {!isBasic && (
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="festival" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Festival
          </TabsTrigger>
        </TabsList>
      )}

      {/* General Tab: Org & Branding */}
      {!isBasic && (
        <TabsContent value="general" className="space-y-6">
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            {/* Branding Redesign */}
            <Card className="overflow-hidden border-primary/10 shadow-sm">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Visual Identity</CardTitle>
                    <CardDescription>
                      Customise how your festival appears online.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Logo Preview Section */}
                  <div className="relative group">
                    <div
                      className={cn(
                        "w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300",
                        formData.logo
                          ? "border-primary/20"
                          : "border-muted-foreground/20 bg-muted/50",
                      )}
                    >
                      {formData.logo ? (
                        <Image
                          src={formData.logo}
                          alt="Festival Logo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                      )}

                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>

                    {formData.logo && !isReadOnly && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Upload Controls Section */}
                  <div className="flex-1 space-y-4 text-center md:text-left w-full">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground">
                        Festival Logo
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Recommended: Square image (512x512px). Supports PNG,
                        JPG, or SVG up to 1MB.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "gap-2 border-primary/20 hover:bg-primary/5",
                          logoError && "border-destructive text-destructive",
                        )}
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo || isReadOnly}
                      >
                        <Upload className="h-4 w-4" />
                        {formData.logo ? "Change Logo" : "Upload Logo"}
                      </Button>

                      <input
                        type="file"
                        ref={logoInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />

                      {formData.logo && !logoError && (
                        <p className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                          Currently using custom logo
                        </p>
                      )}
                    </div>

                    {logoError && (
                      <p className="text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                        {logoError}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    Organization & Online
                  </CardTitle>
                </div>
                <CardDescription>
                  Public organization info and subdomain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={formData.orgName}
                      onChange={(e) =>
                        setFormData({ ...formData, orgName: e.target.value })
                      }
                      placeholder="Organization Name"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="orgDescription">
                      Organization Description
                    </Label>
                    <Textarea
                      id="orgDescription"
                      value={formData.orgDescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          orgDescription: e.target.value,
                        })
                      }
                      placeholder="Short description..."
                      rows={3}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgWebsite">Website</Label>
                    <Input
                      id="orgWebsite"
                      value={formData.orgWebsite}
                      onChange={(e) =>
                        setFormData({ ...formData, orgWebsite: e.target.value })
                      }
                      placeholder="https://..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgLocation">Location</Label>
                    <Input
                      id="orgLocation"
                      value={formData.orgLocation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          orgLocation: e.target.value,
                        })
                      }
                      placeholder="City, Country"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="slug">Subdomain</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({ ...formData, slug: e.target.value })
                        }
                        className="font-mono"
                        disabled={isReadOnly}
                      />
                      <span className="text-sm text-muted-foreground">
                        .greenroom.com
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSavingGeneral || isReadOnly || !hasChanges}
                className="min-w-[160px]"
              >
                {isSavingGeneral && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </TabsContent>
      )}

      {/* Festival Tab: Basics & Config */}
      <TabsContent value="festival" className="space-y-6">
        <form onSubmit={handleSaveFestival} className="space-y-6">
          {/* Festival Basics Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Festival Basics</CardTitle>
              </div>
              <CardDescription>
                Core identity and timing of your festival.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Festival Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="E.g. Summer Arts 2025"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Briefly describe your festival..."
                    rows={3}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <DatePicker
                    id="startDate"
                    date={formData.startDate || undefined}
                    onChange={(date) =>
                      setFormData({ ...formData, startDate: date ?? null })
                    }
                    placeholder="Pick start date"
                    from={durationStart}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <DatePicker
                    id="endDate"
                    date={formData.endDate || undefined}
                    onChange={(date) =>
                      setFormData({ ...formData, endDate: date ?? null })
                    }
                    placeholder="Pick end date"
                    from={formData.startDate || durationStart}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="location">Venue / City</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="City, Country"
                    disabled={isReadOnly}
                  />
                </div>
                {isBasic && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="slug-basic">Subdomain</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="slug-basic"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({ ...formData, slug: e.target.value })
                        }
                        className="font-mono"
                        disabled={isReadOnly}
                      />
                      <span className="text-sm text-muted-foreground">
                        .greenroom.com
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Festival Configuration Section (Standard+) */}
          {!isBasic && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    Festival Configuration
                  </CardTitle>
                </div>
                <CardDescription>
                  Deadlines and participant limits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {FeatureService.isFeatureEnabled(
                  resolvedTier,
                  "programmeAssignmentDeadline",
                ) && (
                  <div className="grid gap-2">
                    <Label htmlFor="programmeAssignment">
                      Programme Assignment Deadline
                    </Label>
                    <DateTimePicker
                      id="programmeAssignment"
                      value={
                        formData.programmeAssignmentDeadline
                          ? parseStoredInstant(
                              formData.programmeAssignmentDeadline,
                            )
                          : null
                      }
                      onChange={(value) => {
                        if (festivalHasStarted) return;
                        setFormData({
                          ...formData,
                          programmeAssignmentDeadline: value
                            ? value.toISOString()
                            : "",
                        });
                      }}
                      placeholder="Pick deadline"
                      from={durationStart}
                      to={festivalStartDate ?? undefined}
                      disabled={festivalHasStarted || isReadOnly}
                    />
                    <p className="text-sm text-muted-foreground">
                      Team Leaders cannot assign students to programmes after
                      this time.
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="teamLeaderLimit">
                    Team Leader Limit Per Group
                  </Label>
                  <Input
                    id="teamLeaderLimit"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.teamLeaderLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teamLeaderLimit: Number(e.target.value),
                      })
                    }
                    disabled={isReadOnly}
                  />
                  <p className="text-sm text-muted-foreground">
                    Max team leaders per group.
                  </p>
                </div>

                {FeatureService.isFeatureEnabled(
                  resolvedTier,
                  "advancedSettings",
                ) && (
                  <div className="rounded-lg border border-dashed p-4 space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Advanced Settings
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Additional options for your plan.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSavingFestival || isReadOnly || !hasChanges}
              className="min-w-[160px]"
            >
              {isSavingFestival && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Festival Settings
            </Button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}
