import Link from "next/link"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Register | Greenroom",
  description: "Create a new account",
}

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create an account"
      description="Enter your email to create your account"
    >
      <RegisterForm />
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
