import Link from "next/link"
import { LoginForm } from "@/components/auth/LoginForm"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login | Greenroom",
  description: "Login to your account",
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Enter your credentials to access your account"
    >
      <LoginForm />
      <div className="mt-4 text-center text-sm text-muted-foreground">
         <Link
            href="/forgot-password"
            className="underline underline-offset-4 hover:text-primary"
          >
            Forgot your password?
          </Link>
      </div>
      <div className="mt-2 text-center text-sm text-muted-foreground">
        Do not have an account?{" "}
        <Link
          href="/register"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign up
        </Link>
      </div>
    </AuthLayout>
  )
}
