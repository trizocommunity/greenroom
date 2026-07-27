"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { useIsMobile } from "@/components/common/use-mobile";
import { cn } from "@/core/utils/cn";

const DrawerDirectionContext = React.createContext<
  "top" | "bottom" | "left" | "right"
>("bottom");

type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root> & {
  direction?: "top" | "bottom" | "left" | "right";
  side?: "top" | "bottom" | "left" | "right";
};

const Drawer = ({
  shouldScaleBackground = true,
  direction,
  side,
  ...props
}: DrawerProps) => {
  const isMobile = useIsMobile();
  const explicitDirection = direction ?? side;
  const responsiveDirection =
    explicitDirection ?? (isMobile ? "bottom" : "right");

  return (
    <DrawerDirectionContext.Provider value={responsiveDirection}>
      <DrawerPrimitive.Root
        shouldScaleBackground={shouldScaleBackground}
        direction={responsiveDirection}
        {...props}
      />
    </DrawerDirectionContext.Provider>
  );
};
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  direction?: "top" | "bottom" | "left" | "right";
  side?: "top" | "bottom" | "left" | "right";
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  DrawerContentProps
>(({ className, children, direction, side, ...props }, ref) => {
  const isMobile = useIsMobile();
  const contextDirection = React.useContext(DrawerDirectionContext);
  const explicitDirection = direction ?? side;
  const responsiveDirection =
    explicitDirection ?? contextDirection ?? (isMobile ? "bottom" : "right");

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-background p-4 sm:p-6 gap-3 sm:gap-4",
          responsiveDirection === "bottom" &&
            "inset-x-0 bottom-0 rounded-t-[14px] border-t max-h-[85vh] overflow-hidden",
          responsiveDirection === "top" &&
            "inset-x-0 top-0 rounded-b-[14px] border-b max-h-[85vh] overflow-hidden",
          responsiveDirection === "left" &&
            "inset-y-0 left-0 h-full w-4/5 sm:w-3/4 border-r sm:max-w-sm overflow-hidden",
          responsiveDirection === "right" &&
            "inset-y-0 right-0 h-full w-full sm:w-3/4 border-l sm:min-w-[500px] sm:max-w-[800px] overflow-hidden",
          className,
        )}
        {...props}
      >
        {responsiveDirection === "bottom" && (
          <div className="mx-auto mb-2 h-1.5 sm:h-2 w-[80px] sm:w-[100px] shrink-0 rounded-full bg-muted" />
        )}
        {responsiveDirection === "left" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-[60px] sm:w-[100px] shrink-0 rounded-full bg-muted -rotate-90" />
        )}
        {responsiveDirection === "right" && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-[60px] sm:w-[100px] shrink-0 rounded-full bg-muted -rotate-90" />
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "grid gap-1 sm:gap-1.5 text-center sm:text-left shrink-0",
      className,
    )}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex p-1 flex-col gap-2 shrink-0 pt-2", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
