import Link from "next/link"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Reset Password | Greenroom",
  description: "Set a new password",
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Reset Password"
      description="Enter your new password below"
    >
      <Suspense fallback={<div>Loading...</div>}>
         <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  )
}
