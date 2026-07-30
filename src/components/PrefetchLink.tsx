"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type PrefetchLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
  onHover?: () => void;
};

export function PrefetchLink({
  children,
  onHover,
  ...props
}: PrefetchLinkProps) {
  return (
    <Link {...props} onMouseEnter={onHover}>
      {children}
    </Link>
  );
}
