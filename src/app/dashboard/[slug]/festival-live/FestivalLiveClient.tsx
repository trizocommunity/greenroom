"use client";

import { Maximize2, Radio, Sparkles } from "lucide-react";
import party from "party-js";
import { useEffect, useState } from "react";
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
import { cn } from "@/core/utils/cn";
import { setPublicSiteEnabledAction } from "@/features/festivals/actions/festival-crud.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

interface FestivalLiveClientProps {
  festivalId: string;
  festivalSlug: string;
  publicSiteEnabled: boolean;
  publicUrl: string;
}

export function FestivalLiveClient({
  festivalId,
  festivalSlug,
  publicSiteEnabled,
  publicUrl,
}: FestivalLiveClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const [enabled, setEnabled] = useState(publicSiteEnabled);
  const [loading, setLoading] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    if (justEnabled) {
      party.confetti(document.body, {
        count: 80,
        size: 2,
        speed: 12,
        spread: 360,
      });
      setJustEnabled(false);
    }
  }, [justEnabled]);

  const handleToggle = async (checked: boolean) => {
    if (isReadOnly) return;
    setLoading(true);
    try {
      const result = await setPublicSiteEnabledAction(festivalId, checked);
      if (result?.success) {
        if (checked) setJustEnabled(true);
        setEnabled(checked);
        toast.success(
          checked
            ? "Your festival is now live!"
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

  const fullPublicUrl = publicUrl || `/${festivalSlug}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid gap-6">
        {enabled && fullPublicUrl && (
          <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Radio className="h-5 w-5 animate-pulse" />
                  <CardTitle className="text-lg">
                    Your festival is live
                  </CardTitle>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a
                    href={`/${festivalSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Expand
                  </a>
                </Button>
              </div>
              <CardDescription>
                Share this link with your audience. Anyone with the link can
                view your public festival site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl overflow-hidden border bg-muted/30 aspect-video">
                <iframe
                  src={`/${festivalSlug}`}
                  className="w-full h-full"
                  title="Festival live preview"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-sm break-all">
                <span className="text-muted-foreground shrink-0">URL</span>
                <span className="min-w-0 truncate" title={fullPublicUrl}>
                  {fullPublicUrl}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card
          className={cn(
            "transition-all duration-500",
            enabled && "border-primary/50 shadow-md",
          )}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              {enabled && (
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              )}
              <CardTitle className="text-xl">Festival Live</CardTitle>
            </div>
            <CardDescription>
              {enabled
                ? "Your public festival site is live. Turn it off to make changes before updating."
                : "Enable your public festival site to share it with your audience."}
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
                  Make your festival publicly visible.
                </p>
              </div>
              <Switch
                id="public-site-toggle"
                className="scale-125 data-[state=checked]:bg-primary"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={loading || isReadOnly}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
