"use client";

import { Copy, ExternalLink, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { InstitutionType } from "@prisma/client";
import { useFeatures } from "@/hooks/useFeature";
import { setPublicSiteEnabledAction, updateFestivalBrandingAction } from "@/server/actions/festival.actions";
import { updateFestivalAction } from "@/server/actions/user-festival.actions";
import type { FestivalBranding } from "@/types/festival";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const [enabled, setEnabled] = useState(publicSiteEnabled);
  const [loading, setLoading] = useState(false);
  const [festivalForm, setFestivalForm] = useState(festivalDetails);
  const features = useFeatures();
  const [brandingForm, setBrandingForm] = useState({
    logo: branding?.logo || "",
    heroImage: branding?.heroImage || "",
    accentColor: branding?.colors?.primary || "#000000",
  });
  const [savingBasics, setSavingBasics] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const result = await setPublicSiteEnabledAction(festivalId, checked);
      if (result?.success) {
        setEnabled(checked);
        toast.success(checked ? "Public website is now live." : "Public website is now disabled.");
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

  const fullPublicUrl = publicUrl || (typeof window !== "undefined" ? `${window.location.origin}/${festivalSlug}` : `/${festivalSlug}`);

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
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = objectUrl;
      });
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

    const cloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";
    const preset =
      process.env.NEXT_PUBLIC_CLOUDINARY_FESTIVAL_PRESET ||
      "greenroom_festival_unsigned";

    if (!cloudName || !preset) {
      toast.error("Cloudinary is not fully configured yet.");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
    formData.append("folder", `greenroom/festivals/${kind}`);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );
    if (!res.ok) {
      toast.error("Upload failed. Please try again.");
      return null;
    }
    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
      toast.error("Upload response missing URL.");
      return null;
    }
    return data.secure_url;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">


        <div className="grid gap-4 md:grid-cols-2">
          {/* When Live: copiable link section at top — unique shareable UI */}
          {enabled && fullPublicUrl && (
            <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary">
                  <Radio className="h-5 w-5" />
                  <CardTitle className="text-lg">Your festival is live</CardTitle>
                </div>
                <CardDescription>
                  Share this link with your audience. Anyone with the link can view your public festival site.
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
                <Button asChild variant="secondary" size="sm" className="gap-2">
                  <a href={fullPublicUrl} target="_blank" rel="noopener noreferrer">
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
          <Card className={ cn("col-span-2", enabled && "col-span-1 h-full")}>
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
                  <Label htmlFor="public-site-toggle" className="text-sm font-medium">
                    Enable public festival website
                  </Label>
                  {canEnable ? (
                    <Switch
                      id="public-site-toggle"
                      checked={enabled}
                      onCheckedChange={handleToggle}
                      disabled={loading}
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
                            disabled={loading || (!enabled && !canEnable)}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        Complete all required content below before enabling.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {!canEnable && validationErrors.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Required before enabling
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
        </div>

        {/* Festival Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Festival basics</CardTitle>
              <CardDescription>Update name, description, dates, and location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fest-name">Festival name</Label>
                <Input
                  id="fest-name"
                  value={festivalForm.name}
                  onChange={(e) =>
                    setFestivalForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="E.g. Summer Arts 2025"
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
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fest-start">Start date</Label>
                  <Input
                    id="fest-start"
                    type="date"
                    value={
                      festivalForm.startDate instanceof Date
                        ? festivalForm.startDate.toISOString().split("T")[0]
                        : typeof festivalForm.startDate === "string" &&
                            festivalForm.startDate
                          ? festivalForm.startDate.split("T")[0]
                          : ""
                    }
                    onChange={(e) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        startDate: e.target.value || null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fest-end">End date</Label>
                  <Input
                    id="fest-end"
                    type="date"
                    value={
                      festivalForm.endDate instanceof Date
                        ? festivalForm.endDate.toISOString().split("T")[0]
                        : typeof festivalForm.endDate === "string" &&
                            festivalForm.endDate
                          ? festivalForm.endDate.split("T")[0]
                          : ""
                    }
                    onChange={(e) =>
                      setFestivalForm((prev) => ({
                        ...prev,
                        endDate: e.target.value || null,
                      }))
                    }
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
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  disabled={savingBasics}
                  onClick={async () => {
                    setSavingBasics(true);
                    try {
                      const res = await updateFestivalAction({
                        ...festivalForm,
                      } as any);
                      if (res.success) {
                        toast.success("Festival basics updated.");
                        router.refresh();
                      } else {
                        toast.error(res.error || "Failed to update festival.");
                      }
                    } catch {
                      toast.error("Failed to update festival.");
                    } finally {
                      setSavingBasics(false);
                    }
                  }}
                >
                  {savingBasics && <span className="mr-2 h-3 w-3 animate-spin border border-current border-t-transparent rounded-full" />}
                  Save basics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization & online</CardTitle>
              <CardDescription>Organization info and public subdomain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fest-org-name">Organization name</Label>
                <Input
                  id="fest-org-name"
                  value={festivalForm.orgName || ""}
                  onChange={(e) =>
                    setFestivalForm((prev) => ({ ...prev, orgName: e.target.value }))
                  }
                  placeholder="Org name"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fest-slug">Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="fest-slug"
                    value={festivalForm.slug}
                    onChange={(e) =>
                      setFestivalForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    className="font-mono"
                    placeholder="my-festival"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    .greenroom.com
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview:{" "}
                  <span className="font-mono">
                    https://{festivalForm.slug || "your-festival"}.greenroom.com
                  </span>
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  disabled={savingOrg}
                  onClick={async () => {
                    setSavingOrg(true);
                    try {
                      const res = await updateFestivalAction({
                        ...festivalForm,
                      } as any);
                      if (res.success) {
                        toast.success("Organization & online details updated.");
                        router.refresh();
                      } else {
                        toast.error(res.error || "Failed to update festival.");
                      }
                    } catch {
                      toast.error("Failed to update festival.");
                    } finally {
                      setSavingOrg(false);
                    }
                  }}
                >
                  {savingOrg && <span className="mr-2 h-3 w-3 animate-spin border border-current border-t-transparent rounded-full" />}
                  Save organization
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>Control logo, hero image, and accent color used on the public site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.canUseCustomColors && (
              <div className="space-y-2">
                <Label htmlFor="brand-accent">Accent color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="brand-accent"
                    type="color"
                    className="h-10 w-14 p-1 cursor-pointer"
                    value={brandingForm.accentColor}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                  />
                  <Input
                    value={brandingForm.accentColor}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    placeholder="#000000"
                    className="font-mono max-w-32"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Primary/accent color for buttons and highlights on your public site.</p>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-logo">Logo URL</Label>
                <Input
                  id="brand-logo"
                  value={brandingForm.logo}
                  onChange={(e) =>
                    setBrandingForm((prev) => ({ ...prev, logo: e.target.value }))
                  }
                  placeholder="https://..."
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingLogo(true);
                    try {
                      const url = await uploadToCloudinary(file, "logo");
                      if (url) {
                        setBrandingForm((prev) => ({ ...prev, logo: url }));
                        toast.success("Logo uploaded. Click Save branding to apply.");
                      }
                    } finally {
                      setUploadingLogo(false);
                      e.target.value = "";
                    }
                  }}
                />
                {uploadingLogo && (
                  <p className="text-xs text-muted-foreground">Uploading logo…</p>
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
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingHero(true);
                    try {
                      const url = await uploadToCloudinary(file, "hero");
                      if (url) {
                        setBrandingForm((prev) => ({ ...prev, heroImage: url }));
                        toast.success("Hero image uploaded. Click Save branding to apply.");
                      }
                    } finally {
                      setUploadingHero(false);
                      e.target.value = "";
                    }
                  }}
                />
                {uploadingHero && (
                  <p className="text-xs text-muted-foreground">Uploading hero image…</p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                disabled={savingBranding}
                onClick={async () => {
                  setSavingBranding(true);
                  try {
                    const res = await updateFestivalBrandingAction({
                      logo: brandingForm.logo || null,
                      heroImage: brandingForm.heroImage || null,
                      accentColor: features.canUseCustomColors ? (brandingForm.accentColor || null) : undefined,
                    });
                    if (res.success) {
                      toast.success("Branding updated.");
                      router.refresh();
                    } else {
                      toast.error("Failed to update branding.");
                    }
                  } catch {
                    toast.error("Failed to update branding.");
                  } finally {
                    setSavingBranding(false);
                  }
                }}
              >
                {savingBranding && (
                  <span className="mr-2 h-3 w-3 animate-spin border border-current border-t-transparent rounded-full" />
                )}
                Save branding
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </TooltipProvider>
  );
}
