# Vercel Deployment Guide

This guide outlines the steps to configure and deploy the application on Vercel, specifically handling wildcard subdomains.

## 1. Add Domains in Vercel

1.  Go to your Vercel Project Dashboard > **Settings** > **Domains**.
2.  **Add your Main Domain**:
    *   Enter `yourdomain.com` (e.g., `greenroom.com`).
    *   Vercel will provide DNS records (usually an **A Record** `@` pointing to `76.76.21.21`).
3.  **Add your Wildcard Domain**:
    *   Enter `*.yourdomain.com` (e.g., `*.greenroom.com`).
    *   Vercel will verify this. You usually need to add a **CNAME Record** for `*` pointing to `cname.vercel-dns.com`.

## 2. Configure DNS

Log in to your Domain Registrar and add the records:

| Type | Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Auto |
| **CNAME**| `*` | `cname.vercel-dns.com` | Auto |
| **CNAME**| `www` | `cname.vercel-dns.com` | Auto |

> **Note**: DNS propagation may take some time.

## 3. Environment Variables

Go to **Settings** > **Environment Variables** in Vercel and add:

*   **`NEXT_PUBLIC_MAIN_DOMAIN`**:
    *   Value: `yourdomain.com` (e.g., `trizo.com`)
    *   *Must match your main domain exactly.*
*   **`NEXT_PUBLIC_APP_URL`**:
    *   Value: `https://yourdomain.com`
    *   *Used for system redirects.*

*   **`DATABASE_URL`**:
    *   Value: Supabase **connection pooler** URL (e.g. `postgres://user:password@aws-1-...pooler.supabase.com:6543/postgres?pgbouncer=true`).
    *   *Used by the app at runtime via `src/lib/db.ts`.*

*   **`DIRECT_URL`**:
    *   Value: Supabase **direct** URL (e.g. `postgres://user:password@aws-1-...supabase.com:5432/postgres`).
    *   *Used by Prisma migrations and seed via `prisma.config.ts` and `prisma/seed.ts`.*

## 4. Framework & Proxy

*   The application uses Next.js 16.
*   The subdomain logic is handled in `src/proxy.ts`.
*   Ensure Vercel uses the default Next.js output settings.

## 5. Redeploy

1.  Go to the **Deployments** tab.
2.  Click the **three dots** on the latest deployment.
3.  Select **Redeploy** to ensure new environment variables and proxy logic are applied.

## Testing

1.  Visit `https://yourdomain.com` -> Loads Landing Page.
2.  Visit `https://test.yourdomain.com` -> Rewrites to `/_sites/test` (or configured tenant path).
3.  Visit `https://test.yourdomain.com/dashboard` -> Redirects to `https://yourdomain.com/dashboard/test`.
