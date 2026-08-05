import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth browser client.
 *
 * Used by client components for sign-in / sign-out / session reads.
 * The actual cookie is set by the catch-all server route at
 * `/api/auth/[...all]`; this client just drives the fetch.
 *
 * `baseURL` defaults to the current origin in the browser. We pass
 * `NEXT_PUBLIC_APP_URL` for SSR-time callers so the relative fetch
 * resolves correctly.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? undefined),
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
