import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps extends ComponentPropsWithoutRef<"div"> {
  title?: string;
  description?: string;
  showLogo?: boolean;
}

export function AuthLayout({
  children,
  className,
  title,
  description,
  showLogo = true,
  ...props
}: AuthLayoutProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen items-center justify-center p-4 overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-background -z-20" />
      <div className="absolute inset-x-0 top-10 bottom-10 bg-linear-to-r from-transparent via-primary/5 to-transparent blur-3xl -z-10" />

      <div className="w-full max-w-[400px] relative z-10">
        {showLogo && (
          <div className="flex justify-center mb-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-black text-2xl tracking-tighter uppercase"
            >
              Greenroom
            </Link>
          </div>
        )}
        <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle glow inside card */}
          <div className="absolute -inset-1 bg-linear-to-br from-primary/10 via-transparent to-transparent opacity-50 blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {(title || description) && (
              <div className="mb-6 space-y-2 text-center">
                {title && (
                  <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
