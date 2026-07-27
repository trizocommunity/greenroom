"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/core/utils/cn";
import { AuthShowcase } from "./AuthShowcase";

interface AuthLayoutContextValue {
  align: "left" | "center";
  setAlign: (align: "left" | "center") => void;
}

const AuthLayoutContext = createContext<AuthLayoutContextValue | null>(null);

export function useAuthLayout() {
  return useContext(AuthLayoutContext);
}

interface AuthLayoutProps extends ComponentPropsWithoutRef<"div"> {
  title?: string;
  description?: string;
  showLogo?: boolean;
  variant?: "centered" | "split";
  align?: "left" | "center";
}

export function AuthLayout({
  children,
  className,
  title,
  description,
  showLogo = true,
  variant = "centered",
  align: initialAlign = "left",
  ...props
}: AuthLayoutProps) {
  const [align, setAlign] = useState<"left" | "center">(initialAlign);

  useEffect(() => {
    setAlign(initialAlign);
  }, [initialAlign]);

  const alignClass = align === "center" ? "text-center" : "text-left";

  if (variant === "centered") {
    return (
      <AuthLayoutContext.Provider value={{ align, setAlign }}>
        <div
          className={cn(
            "relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-background",
            className,
          )}
          {...props}
        >
          {/* Concentric rings and glowing gradient background inspired by reference */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
            <div className="absolute w-[700px] h-[700px] bg-primary/10 rounded-full blur-[140px] -top-32" />
            <div className="absolute w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] bottom-10" />

            <svg
              className="absolute w-[1300px] h-[1300px] sm:w-[1500px] sm:h-[1500px] text-border/40 dark:text-border/20 opacity-75 stroke-current fill-none pointer-events-none -top-[350px] sm:-top-[380px]"
              viewBox="0 0 1400 1400"
              xmlns="http://www.w3.org/2000/svg"
            >
              {[...Array(28)].map((_, i) => (
                <circle
                  key={i}
                  cx="700"
                  cy="700"
                  r={220 + i * 25}
                  strokeWidth="1"
                  strokeDasharray={i % 2 === 0 ? "none" : "4 4"}
                />
              ))}
            </svg>
          </div>

          {/* Top Branding - Greenroom text instead of logo */}
          {showLogo && (
            <div className="flex flex-col items-center justify-center mb-4 sm:mb-5 relative z-10">
              <Link
                href="/"
                className="flex items-center gap-2 font-black text-2xl sm:text-3xl tracking-tighter uppercase bg-gradient-to-r from-primary via-secondary to-primary/80 bg-clip-text text-transparent hover:opacity-90 transition-opacity"
              >
                Greenroom
              </Link>
            </div>
          )}

          {/* Centered Rounded Card Modal */}
          <div className="w-full max-w-[370px] sm:max-w-[400px] rounded-2xl sm:rounded-3xl border border-border/40 bg-card/90 dark:bg-card/85 shadow-xl backdrop-blur-2xl p-5 sm:p-6 md:p-7 relative z-10 transition-all">
            {(title || description) && (
              <div className={cn("mb-6 transition-all", alignClass)}>
                {title && (
                  <h1 className="text-lg sm:text-xl font-medium tracking-tight text-foreground">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-xs sm:text-sm text-muted-foreground leading-normal">
                    {description}
                  </p>
                )}
              </div>
            )}

            <div className="w-full">{children}</div>
          </div>
        </div>
      </AuthLayoutContext.Provider>
    );
  }

  return (
    <AuthLayoutContext.Provider value={{ align, setAlign }}>
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
                <div className={cn("space-y-2 transition-all", alignClass)}>
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
    </AuthLayoutContext.Provider>
  );
}
