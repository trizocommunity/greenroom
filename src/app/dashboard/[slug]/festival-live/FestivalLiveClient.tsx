"use client";

import { Copy, ExternalLink, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uploadImageToCloudinary } from "@/core/integrations/cloudinary";
import type { InstitutionType } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import {
  setPublicSiteEnabledAction,
  updateFestivalBrandingAction,
  updateFestivalSettingsAction,
} from "@/features/festivals/actions/festival-crud.actions";
import { updateFestivalAction } from "@/features/festivals/actions/user-festival.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import type { FestivalBranding } from "@/features/festivals/types/festival.types";
import { useFeatures } from "@/features/plan-features/hooks/use-feature";

interface FestivalLiveClientProps {
  festivalId: string;
  festivalSlug: string;
  festivalDetails: {
    name: string;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    orgName: string | null;
    orgDescription: string | null;
    orgWebsite: string | null;
    orgLocation: string | null;
    establishedYear: number | null;
    institutionType: InstitutionType | null;
    institutionName: string | null;
    location: string | null;
    founderName: string | null;
    founderMessage: string | null;
    slug: string;
    createdAt: Date | string | null;
    expiresAt: Date | string | null;
  };
  branding: FestivalBranding | null;
  publicSiteEnabled: boolean;
  canEnable: boolean;
  validationErrors: string[];
  publicUrl: string;
  isBasicTier: boolean;
}

export function FestivalLiveClient({
  festivalId,
  festivalSlug,
  festivalDetails,
  branding,
  publicSiteEnabled,
  canEnable,
  validationErrors,
  publicUrl,
  isBasicTier,
}: FestivalLiveClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const router = useRouter();
  const [enabled, setEnabled] = useState(publicSiteEnabled);
  const [loading, setLoading] = useState(false);
  const [festivalForm, setFestivalForm] = useState(festivalDetails);
  const features = useFeatures();
  const [brandingForm, setBrandingForm] = useState({
    logo: branding?.logo || "",
    heroImage: branding?.heroImage || "",
  });
  const [savingAll, setSavingAll] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const initialFestivalRef = useRef(festivalDetails);
  const initialBrandingRef = useRef({
    logo: branding?.logo || "",
    heroImage: branding?.heroImage || "",
  });

  const hasFestivalChanges =
    JSON.stringify(festivalForm) !== JSON.stringify(initialFestivalRef.current);
  const hasBrandingChanges =
    JSON.stringify(brandingForm) !== JSON.stringify(initialBrandingRef.current);
  const hasChanges = hasFestivalChanges || hasBrandingChanges;
  const normalizeDateValue = (value: Date | string | null | undefined) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };
  const hasDateOnlyFestivalChange =
    normalizeDateValue(festivalForm.startDate) !==
      normalizeDateValue(initialFestivalRef.current.startDate) ||
    normalizeDateValue(festivalForm.endDate) !==
      normalizeDateValue(initialFestivalRef.current.endDate);
  const hasNonDateFestivalChange =
    (festivalForm.name ?? "") !== (initialFestivalRef.current.name ?? "") ||
    (festivalForm.description ?? null) !==
      (initialFestivalRef.current.description ?? null) ||
    (festivalForm.location ?? null) !==
      (initialFestivalRef.current.location ?? null) ||
    (festivalForm.orgName ?? null) !==
      (initialFestivalRef.current.orgName ?? null) ||
    (festivalForm.orgDescription ?? null) !==
      (initialFestivalRef.current.orgDescription ?? null) ||
    (festivalForm.orgWebsite ?? null) !==
      (initialFestivalRef.current.orgWebsite ?? null) ||
    (festivalForm.orgLocation ?? null) !==
      (initialFestivalRef.current.orgLocation ?? null) ||
    (festivalForm.slug ?? "") !== (initialFestivalRef.current.slug ?? "");
  const canSaveInReadOnly =
    hasDateOnlyFestivalChange && !hasNonDateFestivalChange;
  const canSave = isReadOnly ? canSaveInReadOnly : hasChanges;
  const hasFestivalDateChange = hasDateOnlyFestivalChange;
  const parseSafeDate = (value: Date | string | null | undefined) => {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const planStartDate = parseSafeDate(festivalDetails.createdAt);
  const planExpiryDate = parseSafeDate(festivalDetails.expiresAt);

  const validateDateWindow = () => {
    const start =
      festivalForm.startDate instanceof Date
        ? festivalForm.startDate
        : festivalForm.startDate
          ? new Date(festivalForm.startDate)
          : null;
    const end =
      festivalForm.endDate instanceof Date
        ? festivalForm.endDate
        : festivalForm.endDate
          ? new Date(festivalForm.endDate)
          : null;

    if (
      !start ||
      !end ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      toast.error("Please select valid start and end dates.");
      return null;
    }
    if (start > end) {
      toast.error("Start date must be before end date.");
      return null;
    }
    if (planStartDate && start < planStartDate) {
      toast.error("Start date must be on/after plan created date.");
      return null;
    }
    if (planExpiryDate && end > planExpiryDate) {
      toast.error("End date must be on/before plan expiry date.");
      return null;
    }
    return { start, end };
  };

  const handleToggle = async (checked: boolean) => {
    if (isReadOnly) return;
    setLoading(true);
    try {
      const result = await setPublicSiteEnabledAction(festivalId, checked);
      if (result?.success) {
        setEnabled(checked);
        toast.success(
          checked
            ? "Public website is now live."
            : "Public website is now disabled.",
        );
      } else {
        const message =
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Failed to update.";
        toast.error(message);
      }
    } catch {
      toast.error("Failed to update.");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard.");
  };

  const fullPublicUrl =
    publicUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/${festivalSlug}`
      : `/${festivalSlug}`);

  const uploadToCloudinary = async (file: File, kind: "logo" | "hero") => {
    const maxSizeBytes = kind === "logo" ? 1 * 1024 * 1024 : 3 * 1024 * 1024; // 1MB logo, 3MB hero
    if (file.size > maxSizeBytes) {
      toast.error(
        kind === "logo"
          ? "Logo must be smaller than 1MB."
          : "Hero image must be smaller than 3MB.",
      );
      return null;
    }

    // Basic dimension check
    const objectUrl = URL.createObjectURL(file);
    try {
      const dims = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = reject;
          img.src = objectUrl;
        },
      );
      const minSize = kind === "logo" ? 64 : 400;
      if (dims.width < minSize || dims.height < minSize) {
        toast.error(
          kind === "logo"
            ? "Logo is too small. Minimum 64×64 pixels."
            : "Hero image is too small. Minimum 400×400 pixels.",
        );
        return null;
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    // Use secure server-side upload (signed, rate-limited, authenticated)
    const url = await uploadImageToCloudinary(file, kind);
    if (!url) {
      toast.error("Upload failed. Please try again.");
      return null;
    }
    return url;
  };

  const handleSaveAll = async () => {
    if (!canSave) return;
    setSavingAll(true);
    try {
      if (isReadOnly) {
        const validDates = validateDateWindow();
        if (!validDates) return;
        const res = await updateFestivalSettingsAction(festivalId, {
          startDate: validDates.start.toISOString(),
          endDate: validDates.end.toISOString(),
        });
        if (res.success) {
          toast.success("Festival dates updated.");
          initialFestivalRef.current = {
            ...initialFestivalRef.current,
            startDate: festivalForm.startDate,
            endDate: festivalForm.endDate,
          };
          router.refresh();
        } else {
          toast.error(
            "error" in res ? res.error : "Failed to update festival dates.",
          );
        }
        return;
      }

      let festivalUpdated = false;
      let brandingUpdated = false;

      if (hasFestivalChanges) {
        let payload: Record<string, unknown> = { ...festivalForm };
        if (hasFestivalDateChange) {
          const validDates = validateDateWindow();
          if (!validDates) return;
          payload = {
            ...payload,
            startDate: validDates.start,
            endDate: validDates.end,
          };
        }
        const res = await updateFestivalAction({
          ...payload,
        } as any);
        if (res.success) {
          festivalUpdated = true;
          initialFestivalRef.current = festivalForm;
        } else {
          toast.error(
            "error" in res ? res.error : "Failed to update festival details.",
          );
        }
      }

      if (hasBrandingChanges) {
        const res = await updateFestivalBrandingAction({
          logo: brandingForm.logo || null,
          heroImage: brandingForm.heroImage || null,
        });
        if (res.success) {
          brandingUpdated = true;
          initialBrandingRef.current = brandingForm;
        } else {
          toast.error("Failed to update branding.");
        }
      }

      if (festivalUpdated || brandingUpdated) {
        toast.success("Changes saved.");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* When Live: copiable link section at top — unique shareable UI */}
          {!isBasicTier && enabled && fullPublicUrl && (
            <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary">
                  <Radio className="h-5 w-5" />
                  <CardTitle className="text-lg">
                    Your festival is live
                  </CardTitle>
                </div>
                <CardDescription>
                  Share this link with your audience. Anyone with the link can
                  view your public festival site.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex-1 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-sm break-all">
                  <span className="text-muted-foreground shrink-0">URL</span>
                  <span className="min-w-0 truncate" title={fullPublicUrl}>
                    {fullPublicUrl}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                  >
                    <a
                      href={fullPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View public site
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={copyUrl}
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enable / Disable control */}
          {!isBasicTier && (
            <Card className={cn("col-span-2", enabled && "col-span-1 h-full")}>
              <CardHeader>
                <CardTitle className="text-base">Public website</CardTitle>
                <CardDescription>
                  {enabled
                    ? "The public festival site is currently live. You can turn it off at any time if you need to make changes."
                    : "Turn this on when you’re ready to share your festival site. While it’s off, visitors will see a not found page."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="public-site-toggle"
                    className="text-sm font-medium"
                  >
                    Enable public festival website
                  </Label>
                  {canEnable ? (
                    <Switch
                      id="public-site-toggle"
                      checked={enabled}
                      onCheckedChange={handleToggle}
                      disabled={loading || isReadOnly}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Switch
                            id="public-site-toggle"
                            checked={enabled}
                            onCheckedChange={(checked) => {
                              if (checked) return;
                              handleToggle(false);
                            }}
                            disabled={
                              loading || isReadOnly || (!enabled && !canEnable)
                            }
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        Complete all required details to enable: festival name &
                        description, organization name & description
                        {!isBasicTier
                          ? ", gallery (4+ images), and at least 1 news post with title, description, and image"
                          : ""}
                        .
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {!canEnable && validationErrors.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Required before enabling (plan-based)
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Festival Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Festival basics</CardTitle>
              <CardDescription>
                Update name, description, dates, and location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fest-name">Festival name</Label>
                <Input
                  id="fest-name"
                  value={festivalForm.name}
                  onChange={(e) =>
                    setFestivalForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="E.g. Summer Arts 2025"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fest-description">Description</Label>
                <Textarea
                  id="fest-description"
                  value={festivalForm.description || ""}
                  onChange={(e) =>
                    setFestivalForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Briefly describe your festival..."
                  disabled={isReadOnly}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fest-start">Start date</Label>
                  <DatePicker
                    id="fest-start"
                    date={
                      festivalForm.startDate instanceof Date
                        ? festivalForm.startDate
                        : typeof festivalForm.startDate === "string" &&
                            festivalForm.startDate
                          ? new Date(festivalForm.startDate)
                          : undefined
                    }
                    onChange={(date) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        startDate: date ?? null,
                      }))
                    }
                    placeholder="Pick start date"
                    from={planStartDate ?? undefined}
                    to={planExpiryDate ?? undefined}
                    showValidityHint
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fest-end">End date</Label>
                  <DatePicker
                    id="fest-end"
                    date={
                      festivalForm.endDate instanceof Date
                        ? festivalForm.endDate
                        : typeof festivalForm.endDate === "string" &&
                            festivalForm.endDate
                          ? new Date(festivalForm.endDate)
                          : undefined
                    }
                    onChange={(date) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        endDate: date ?? null,
                      }))
                    }
                    placeholder="Pick end date"
                    from={planStartDate ?? undefined}
                    to={planExpiryDate ?? undefined}
                    showValidityHint
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fest-location">Venue / City</Label>
                <Input
                  id="fest-location"
                  value={festivalForm.location || ""}
                  onChange={(e) =>
                    setFestivalForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="City, Country"
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>

          {!isBasicTier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Organization & online
                </CardTitle>
                <CardDescription>
                  Organization info and public subdomain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 grid gap-3 grid-cols-2">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="fest-org-name">Organization name</Label>
                  <Input
                    id="fest-org-name"
                    value={festivalForm.orgName || ""}
                    onChange={(e) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        orgName: e.target.value,
                      }))
                    }
                    placeholder="Org name"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="fest-org-description">
                    Organization description
                  </Label>
                  <Textarea
                    id="fest-org-description"
                    value={festivalForm.orgDescription || ""}
                    onChange={(e) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        orgDescription: e.target.value,
                      }))
                    }
                    placeholder="Short description of your organization (required to go live)"
                    rows={3}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fest-org-website">Website</Label>
                  <Input
                    id="fest-org-website"
                    value={festivalForm.orgWebsite || ""}
                    onChange={(e) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        orgWebsite: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fest-org-location">Org location</Label>
                  <Input
                    id="fest-org-location"
                    value={festivalForm.orgLocation || ""}
                    onChange={(e) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        orgLocation: e.target.value,
                      }))
                    }
                    placeholder="City"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="fest-slug">Subdomain</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fest-slug"
                      value={festivalForm.slug}
                      onChange={(e) =>
                        setFestivalForm((prev) => ({
                          ...prev,
                          slug: e.target.value,
                        }))
                      }
                      className="font-mono"
                      placeholder="my-festival"
                      disabled={isReadOnly}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      .greenroom.com
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preview:{" "}
                    <span className="font-mono">
                      https://{festivalForm.slug || "your-festival"}
                      .greenroom.com
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Branding */}
        {!isBasicTier && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branding</CardTitle>
              <CardDescription>
                Control logo, hero image, and accent color used on the public
                site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand-logo">Logo URL</Label>
                  <Input
                    id="brand-logo"
                    value={brandingForm.logo}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        logo: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                    disabled={isReadOnly}
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={isReadOnly}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingLogo(true);
                      try {
                        const url = await uploadToCloudinary(file, "logo");
                        if (url) {
                          setBrandingForm((prev) => ({ ...prev, logo: url }));
                          toast.success(
                            "Logo uploaded. Click Save branding to apply.",
                          );
                        }
                      } finally {
                        setUploadingLogo(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  {uploadingLogo && (
                    <p className="text-xs text-muted-foreground">
                      Uploading logo…
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-hero">Hero image URL</Label>
                  <Input
                    id="brand-hero"
                    value={brandingForm.heroImage}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        heroImage: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                    disabled={isReadOnly}
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={isReadOnly}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingHero(true);
                      try {
                        const url = await uploadToCloudinary(file, "hero");
                        if (url) {
                          setBrandingForm((prev) => ({
                            ...prev,
                            heroImage: url,
                          }));
                          toast.success(
                            "Hero image uploaded. Click Save branding to apply.",
                          );
                        }
                      } finally {
                        setUploadingHero(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  {uploadingHero && (
                    <p className="text-xs text-muted-foreground">
                      Uploading hero image…
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save changes bar */}
        <div className="w-full pt-3 pb-10 flex items-center justify-end bg-background/80 backdrop-blur">
          <Button
            size="lg"
            disabled={!canSave || savingAll}
            onClick={handleSaveAll}
          >
            {savingAll && (
              <span className="mr-2 h-3 w-3 animate-spin border border-current border-t-transparent rounded-full" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
