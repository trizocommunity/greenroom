import Link from "next/link"
import { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

interface AuthLayoutProps extends ComponentPropsWithoutRef<"div"> {
  title?: string
  description?: string
  showLogo?: boolean
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
        "flex min-h-screen items-center justify-center p-4",
        className
      )}
      {...props}
    >
      <div className="w-full max-w-[400px] space-y-6">
        {showLogo && (
          <div className="flex justify-center">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
               Greenroom
            </Link>
          </div>
        )}
        <div className="rounded-xl border bg-card p-6 md:p-8 shadow-sm">
          {(title || description) && (
            <div className="mb-6 space-y-2 text-center">
              {title && <h1 className="text-2xl font-bold">{title}</h1>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
