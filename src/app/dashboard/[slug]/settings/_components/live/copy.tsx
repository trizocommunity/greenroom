"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { toast } from "@/lib/toast";

/** Plain-text clipboard copy with toast feedback — used for share links and
 * the full DNS record dump. */
export async function copyText(value: string, label = "value"): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  } catch {
    toast.error(`Failed to copy ${label}`);
  }
}

/** Inline icon-only copy button. Shows a green check for ~1.5s after a
 * successful copy. Used per-field in the DNS table. */
export function CopyIconButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await copyText(value, label);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onCopy}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
