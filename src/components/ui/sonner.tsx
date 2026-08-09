"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { useIsMobile } from "@/components/common/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Detects whether a full-screen overlay (Dialog, AlertDialog, Sheet, Drawer)
 * is currently open. Uses a MutationObserver so the Toaster can shift to
 * top-right on desktop when a wrapper is present.
 */
function useHasOpenWrapper() {
  const [hasOpen, setHasOpen] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      const open = document.querySelector(
        "[data-radix-dialog-content][data-state='open']," +
          "[data-radix-alert-dialog-content][data-state='open']," +
          "[data-vaul-drawer][data-state='open']",
      );
      setHasOpen(!!open);
    };

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });

    check();
    return () => observer.disconnect();
  }, []);

  return hasOpen;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const hasOpenWrapper = useHasOpenWrapper();

  const position = isMobile
    ? "top-center"
    : hasOpenWrapper
      ? "top-right"
      : "bottom-right";

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) || "light"}
      className="toaster group"
      position={position}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
