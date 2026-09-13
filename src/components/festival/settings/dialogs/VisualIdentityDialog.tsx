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
import { useCloudinaryUpload, useDeleteFile } from "@/api/client";
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
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";

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
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useCloudinaryUpload();
  const deleteFileMutation = useDeleteFile();

  const handleOpenChange = (isOpen: boolean) => {
    // If the drawer is closing and the logo has changed to a new Cloudinary URL but wasn't saved,
    // delete it from Cloudinary to prevent orphaned files.
    if (!isOpen && !isSaving && logo !== (festival.branding?.logo || "")) {
      if (logo.includes("cloudinary.com")) {
        deleteFileMutation.mutate({ url: logo, festivalId: festival.id });
      }
      setLogo(festival.branding?.logo || "");
    }
    setOpen(isOpen);
  };

  const uploadToCloudinary = async (file: File) => {
    setLogoError(null);

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      return;
    }
    
    // For SVG, we might not want to crop, but assuming we do or it's rasterized.
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleCropSubmit = async (croppedFile: File) => {
    setCropImageSrc(null);
    const result = await uploadToCloudinary(croppedFile);
    if (result) {
      setLogo(result.url);
      toast.success("Logo uploaded successfully");
    }
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

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-4">
          <div className="relative group shrink-0">
            <div
              className={cn(
                "w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300",
                logo
                  ? "border-primary/20 bg-white"
                  : "border-muted-foreground/20 bg-muted/50",
              )}
            >
              {logo ? (
                <Image
                  src={logo}
                  alt="Festival Logo"
                  fill
                  className="object-contain"
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
                title="Remove logo"
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-4 text-center sm:text-left flex-1 py-2">
            <div className="space-y-1.5">
              <h4 className="font-semibold text-foreground text-lg">Festival Logo</h4>
              <p className="text-sm text-muted-foreground">
                Recommended: Square image (512x512px).<br className="hidden sm:block" /> Supports PNG, JPG, or SVG up to 1MB.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Button
                type="button"
                variant={logo ? "outline" : "default"}
                size="sm"
                className={cn(
                  "gap-2",
                  logoError && "border-destructive text-destructive",
                )}
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4" />
                {logo ? "Change Logo" : "Upload Logo"}
              </Button>

              {logo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setCropImageSrc(logo)}
                  disabled={uploadMutation.isPending}
                >
                  <ImageIcon className="h-4 w-4" />
                  Recrop
                </Button>
              )}

              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </div>

            {logoError && (
              <p className="text-sm font-medium text-destructive mt-2">
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
      {cropImageSrc && (
        <ImageCropperDialog
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropSubmit={handleCropSubmit}
        />
      )}
    </Drawer>
  );
}
