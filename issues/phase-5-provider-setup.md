# Phase 5: Provider Setup

**Status:** ✅ DONE

## Goal

Replace `TRPCReactProvider` with `QueryClientProvider` in the root layout and remove all tRPC provider references.

## Files to Update

### 1. Root Layout (`src/app/layout.tsx`)

Find and replace the `TRPCReactProvider`:

```typescript
// BEFORE
import { TRPCReactProvider } from "@/trpc/client";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

// AFTER
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/api/client";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export default function RootLayout({ children }) {
  const queryClient = getQueryClient();
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </body>
    </html>
  );
}
```

### 2. Remove tRPC Provider Usage

Search for any other usage of:
- `TRPCProvider`
- `useTRPC`
- `useTRPCClient`
- `HydrateClient` (from `@/trpc/helpers`)

## SSR/Hydration Considerations

If the app uses server-side rendering with dehydration:

- `HydrateClient` was used to pass dehydrated state from server to client
- Consider if this is still needed — if so, reimplement as a simple wrapper
- Otherwise, remove it and rely purely on client-side React Query

## Verification

- [ ] Root layout uses `QueryClientProvider` instead of `TRPCReactProvider`
- [ ] No remaining imports from `@/trpc/client`
- [ ] No remaining imports from `@/trpc/helpers` (except possibly reimplemented helpers)
- [ ] App renders correctly in dev mode
- [ ] `npm run lint` — zero warnings
