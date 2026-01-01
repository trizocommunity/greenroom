"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute default
            // Disable automatic refetching on window focus for better UX
            // Individual hooks can override this if needed
            refetchOnWindowFocus: false,
            // Only retry failed requests once to avoid excessive retries
            retry: 1,
          },
          mutations: {
            // Don't retry mutations by default as they often modify data
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
