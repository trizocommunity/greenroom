"use client";

import {
  Image as ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useCloudinaryUpload } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/core/utils/cn";
import { updateFestivalBrandingAction } from "@/features/festivals/actions/festival-crud.actions";
import { toast } from "@/lib/toast";

interface VisualIdentityDialogProps {
  festival: {
    id: string;
    branding?: {
      logo?: string | null;
    } | null;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function VisualIdentityDialog({
  festival,
  onSuccess,
  trigger,
}: VisualIdentityDialogProps) {
  const [open, setOpen] = useState(false);
  const [logo, setLogo] = useState<string>(festival.branding?.logo || "");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useCloudinaryUpload();

  const uploadToCloudinary = async (file: File) => {
    setLogoError(null);

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

    const maxSizeBytes = 1 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const msg = "Logo is too large. Maximum size is 1MB.";
      setLogoError(msg);
      toast.error(msg);
      return null;
    }

    try {
      const url = await uploadMutation.mutateAsync({
        file,
        folder: "logo",
        festivalId: festival.id,
      });
      return url;
    } catch {
      return null;
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadToCloudinary(file);
    if (result) {
      setLogo(result.url);
      toast.success("Logo uploaded successfully");
    }
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const removeLogo = () => {
    setLogo("");
    toast.info("Logo removed. Save to apply changes.");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateFestivalBrandingAction({
        festivalId: festival.id,
        logo: logo || null,
      });

      if (res.success) {
        toast.success("Visual identity updated");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error("Failed to update visual identity");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger ?? defaultTrigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Visual Identity</DrawerTitle>
          <DrawerDescription>
            Customise how your festival appears online.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative group">
            <div
              className={cn(
                "w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300",
                logo
                  ? "border-primary/20"
                  : "border-muted-foreground/20 bg-muted/50",
              )}
            >
              {logo ? (
                <Image
                  src={logo}
                  alt="Festival Logo"
                  fill
                  className="object-cover"
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              )}

              {uploadMutation.isPending && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>

            {logo && (
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2 text-center">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Festival Logo</h4>
              <p className="text-sm text-muted-foreground">
                Recommended: Square image (512x512px). Supports PNG, JPG, or SVG
                up to 1MB.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 border-primary/20 hover:bg-primary/5",
                  logoError && "border-destructive text-destructive",
                )}
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4" />
                {logo ? "Change Logo" : "Upload Logo"}
              </Button>

              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </div>

            {logoError && (
              <p className="text-sm font-medium text-destructive">
                {logoError}
              </p>
            )}
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
