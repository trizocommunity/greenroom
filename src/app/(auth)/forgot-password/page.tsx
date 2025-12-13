import Link from "next/link"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot Password | Greenroom",
  description: "Reset your password",
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot password?"
      description="Enter your email address and we'll send you a link to reset your password"
    >
      <ForgotPasswordForm />
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Back to login
        </Link>
      </div>
    </AuthLayout>
  )
}
