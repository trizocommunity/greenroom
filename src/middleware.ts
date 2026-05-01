import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Security headers middleware - adds protection against common attacks
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy (restrict browser features)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  );

  // Content Security Policy - strict but allows necessary resources
  // TODO: Adjust based on your specific needs (analytics, fonts, etc.)
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://va.vercel-scripts.com", // jsPDF requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://res.cloudinary.com data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.cloudinary.com https://api.razorpay.com https://lumberjack.razorpay.com https://*.socket.io wss://*.socket.io",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  // HTTP Strict Transport Security - forces HTTPS in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: "/:path*",
};
