"use client";

import type * as React from "react";
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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children}
    </AlertDialog>
  );
};

const ResponsiveDialogTrigger = ({
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogTrigger>) => {
  const isMobile = useIsMobile();

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
  const isMobile = useIsMobile();

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
  const isMobile = useIsMobile();

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerTitle className={className} {...props} />;
  }

  return <AlertDialogTitle className={className} {...props} />;
};

const ResponsiveDialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogDescription>) => {
  const isMobile = useIsMobile();

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
  const isMobile = useIsMobile();

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerClose asChild>
        <AlertDialogAction className={className} {...props} />
      </DrawerClose>
    );
  }

  return <AlertDialogAction className={className} {...props} />;
};

const ResponsiveDialogCancel = ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogCancel>) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerClose asChild>
        <AlertDialogCancel className={className} {...props} />
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
