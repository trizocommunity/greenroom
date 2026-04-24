import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/core/utils/cn";
import { AuthShowcase } from "./AuthShowcase";

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
      className={cn("flex min-h-screen w-full bg-background", className)}
      {...props}
    >
      {/* Left side: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:flex-none xl:px-20">
        <div className="mx-auto w-full max-w-sm lg:max-w-md space-y-8">
          {showLogo && (
            <div className="flex justify-center lg:justify-start">
              <Link
                href="/"
                className="flex items-center gap-2 font-black text-2xl md:text-3xl tracking-tighter uppercase bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
              >
                Greenroom
              </Link>
            </div>
          )}

          <div className="space-y-6">
            {(title || description) && (
              <div className="space-y-2 text-center lg:text-left">
                {title && (
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-base text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            )}

            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>

      {/* Right side: Showcase */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <AuthShowcase />
      </div>
    </div>
  );
}
