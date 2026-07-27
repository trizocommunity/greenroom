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
        <DrawerContent>{children}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>{children}</AlertDialogContent>
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
    return <DrawerHeader className={className} {...props} />;
  }

  return <AlertDialogHeader className={className} {...props} />;
};

const ResponsiveDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerFooter className={className} {...props} />;
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
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div {...props}>{children}</div>;
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
