"use client";

import * as React from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const Sheet = Drawer;
const SheetPortal = DrawerPortal;

const SheetTrigger = DrawerTrigger;

const SheetClose = DrawerClose;

const SheetOverlay = DrawerOverlay;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerContent> {
  direction?: "top" | "bottom" | "left" | "right";
  side?: "top" | "bottom" | "left" | "right";
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerContent>,
  SheetContentProps
>(({ className, children, side, direction, ...props }, ref) => (
  <DrawerContent
    ref={ref}
    direction={direction ?? side}
    className={className}
    {...props}
  >
    {children}
  </DrawerContent>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = DrawerHeader;
const SheetFooter = DrawerFooter;
const SheetTitle = DrawerTitle;
const SheetDescription = DrawerDescription;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
