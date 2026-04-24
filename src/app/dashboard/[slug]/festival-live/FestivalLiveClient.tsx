"use client";

import { Copy, ExternalLink, Radio } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/core/utils/cn";
import { setPublicSiteEnabledAction } from "@/features/festivals/actions/festival-crud.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

interface FestivalLiveClientProps {
  festivalId: string;
  festivalSlug: string;
  publicSiteEnabled: boolean;
  canEnable: boolean;
  validationErrors: string[];
  publicUrl: string;
  isBasicTier: boolean;
}

export function FestivalLiveClient({
  festivalId,
  festivalSlug,
  publicSiteEnabled,
  canEnable,
  validationErrors,
  publicUrl,
  isBasicTier,
}: FestivalLiveClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const [enabled, setEnabled] = useState(publicSiteEnabled);
  const [loading, setLoading] = useState(false);

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

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="grid gap-6">
          {/* When Live: copiable link section at top */}
          {enabled && fullPublicUrl && (
            <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary">
                  <Radio className="h-5 w-5 animate-pulse" />
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
          <Card className={cn(enabled && "border-primary/50 shadow-md")}>
            <CardHeader>
              <CardTitle className="text-xl">Public Visibility</CardTitle>
              <CardDescription>
                {enabled
                  ? "The public festival site is currently live. You can turn it off at any time if you need to make changes."
                  : "Turn this on when you’re ready to share your festival site. While it’s off, visitors will see a 404 page."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="public-site-toggle"
                    className="text-base font-semibold"
                  >
                    Public Festival Website
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Control access to your public landing page.
                  </p>
                </div>
                {canEnable ? (
                  <Switch
                    id="public-site-toggle"
                    className="scale-125"
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
                          className="scale-125"
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
                    <TooltipContent side="left" className="max-w-xs p-3">
                      <p className="font-medium mb-1">Required to enable:</p>
                      <ul className="text-xs list-disc list-inside space-y-1">
                        <li>Festival name & description</li>
                        <li>Organization name & description</li>
                        {!isBasicTier && (
                          <>
                            <li>Gallery (4+ images)</li>
                            <li>At least 1 news post</li>
                          </>
                        )}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {!canEnable && validationErrors.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Action Required
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 italic">
                    Go to Settings to complete your festival and organization
                    profile.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
