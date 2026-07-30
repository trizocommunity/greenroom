"use client";

import * as React from "react";
import { useIsMobile } from "@/components/common/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/core/utils/cn";

/**
 * Shared once at the root and read by every sub-component below. Each
 * sub-component previously called useIsMobile() independently — since that
 * hook only settles on the real value inside a useEffect, the moment the
 * root swaps AlertDialog -> Drawer (a different element type at the same
 * position), React remounts the whole subtree fresh. On that fresh mount
 * the children's own useIsMobile() briefly resets to its initial value
 * before their effect fires, so they'd render AlertDialog-family
 * primitives under an already-swapped Drawer root — a guaranteed
 * "DialogPortal must be used within Dialog" crash, not just an occasional
 * race. A single shared value keeps root and children always in sync.
 */
const ResponsiveDialogMobileContext = React.createContext(false);

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const ResponsiveDialog = ({
  open,
  onOpenChange,
  children,
}: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialogMobileContext.Provider value={isMobile}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      ) : (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
          {children}
        </AlertDialog>
      )}
    </ResponsiveDialogMobileContext.Provider>
  );
};

const ResponsiveDialogTrigger = ({
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogTrigger>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    return (
      <DrawerTrigger asChild {...props}>
        {children}
      </DrawerTrigger>
    );
  }

  return (
    <AlertDialogTrigger asChild {...props}>
      {children}
    </AlertDialogTrigger>
  );
};

const ResponsiveDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    return (
      <DrawerHeader className={cn("p-4 sm:p-6 pb-2", className)} {...props} />
    );
  }

  return <AlertDialogHeader className={className} {...props} />;
};

const ResponsiveDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    return (
      <DrawerFooter
        className={cn("p-4 sm:p-6 pt-2 bg-background", className)}
        {...props}
      />
    );
  }

  return <AlertDialogFooter className={className} {...props} />;
};

const ResponsiveDialogTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogTitle>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    return <DrawerTitle className={className} {...props} />;
  }

  return <AlertDialogTitle className={className} {...props} />;
};

const ResponsiveDialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogDescription>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    return <DrawerDescription className={className} {...props} />;
  }

  return <AlertDialogDescription className={className} {...props} />;
};

const ResponsiveDialogContent = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    return (
      <DrawerContent className="p-0 sm:p-0 gap-0">
        <div className="mx-auto w-full max-w-lg flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <AlertDialogContent className={className} {...props}>
      {children}
    </AlertDialogContent>
  );
};

const ResponsiveDialogAction = ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogAction>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    // AlertDialogAction requires an AlertDialog.Root ancestor, but here the
    // root is <Drawer> (Vaul), not <AlertDialog> — a plain Button avoids
    // the missing-context crash while keeping identical styling/behavior.
    return (
      <DrawerClose asChild>
        <Button className={className} {...props} />
      </DrawerClose>
    );
  }

  return <AlertDialogAction className={className} {...props} />;
};

const ResponsiveDialogCancel = ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogCancel>) => {
  const isMobile = React.useContext(ResponsiveDialogMobileContext);

  if (isMobile) {
    return (
      <DrawerClose asChild>
        <Button
          variant="outline"
          className={cn("mt-2 sm:mt-0", className)}
          {...props}
        />
      </DrawerClose>
    );
  }

  return <AlertDialogCancel className={className} {...props} />;
};

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogAction,
  ResponsiveDialogCancel,
};
