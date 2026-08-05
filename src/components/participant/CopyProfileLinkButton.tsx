"use client";

import { Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface CopyProfileLinkButtonProps {
  profileUrl: string;
}

async function copyToClipboard(profileUrl: string) {
  try {
    await navigator.clipboard.writeText(profileUrl);
    toast.success("Link copied!");
  } catch (error) {
    console.error("Copy failed:", error);
    toast.error("Failed to copy link");
  }
}

export function CopyProfileLinkButton({
  profileUrl,
}: CopyProfileLinkButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs flex-1"
      onClick={() => copyToClipboard(profileUrl)}
    >
      <Link className="h-3 w-3 mr-1" />
      Copy Link
    </Button>
  );
}
