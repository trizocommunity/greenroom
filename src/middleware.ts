import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CSRF_SECRET = process.env.CSRF_SECRET || "default-csrf-secret-change-in-production";
const NONCE_LENGTH = 16;

function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signNonce(nonce: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(nonce),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isStateChangeMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (isStateChangeMethod(request.method)) {
    const cookieNonce = request.cookies.get("_csrf_nonce")?.value;
    const headerNonce = request.headers.get("x-csrf-nonce");

    if (!cookieNonce || !headerNonce || cookieNonce !== headerNonce) {
      return new NextResponse("CSRF validation failed", { status: 403 });
    }

    const expectedSig = await signNonce(cookieNonce, CSRF_SECRET);
    const headerSig = request.headers.get("x-csrf-signature");

    if (headerSig !== expectedSig) {
      return new NextResponse("CSRF validation failed", { status: 403 });
    }
  }

  const nonce = generateNonce();
  const signature = await signNonce(nonce, CSRF_SECRET);

response.cookies.set("_csrf_nonce", nonce, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });

    response.cookies.set("_csrf_sig", signature, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });

    response.headers.set("x-csrf-nonce", nonce);
    response.headers.set("x-csrf-signature", signature);

  const cspNonce = `'nonce-${nonce}'`;

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' ${cspNonce} https://checkout.razorpay.com https://cdn.razorpay.com`,
      `style-src 'self' ${cspNonce}`,
      "img-src 'self' https://res.cloudinary.com data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.cloudinary.com https://api.razorpay.com https://lumberjack.razorpay.com wss://*.socket.io",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
