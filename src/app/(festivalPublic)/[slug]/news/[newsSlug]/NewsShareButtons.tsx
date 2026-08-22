"use client";

import {
  Facebook,
  Link as LinkIcon,
  MessageCircle,
  Share2,
  Twitter,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function NewsShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    if (typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title,
        url,
      });
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  if (canNativeShare) {
    return (
      <Button onClick={handleNativeShare} variant="outline" className="gap-2">
        <Share2 className="w-4 h-4" />
        Share
      </Button>
    );
  }

  // Fallback share buttons if Web Share API is not available
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          window.open(
            `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            "_blank",
          )
        }
      >
        <Twitter className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            "_blank",
          )
        }
      >
        <Facebook className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          window.open(
            `https://wa.me/?text=${encodedTitle} ${encodedUrl}`,
            "_blank",
          )
        }
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={copyToClipboard}>
        <LinkIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}
