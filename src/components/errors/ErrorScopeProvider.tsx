"use client";

import { createContext, useContext } from "react";
import type { ErrorScope } from "@/core/errors/error-store";

const ErrorScopeContext = createContext<ErrorScope | undefined>(undefined);

export function ErrorScopeProvider({
  scope,
  children,
}: {
  scope: ErrorScope;
  children: React.ReactNode;
}) {
  return (
    <ErrorScopeContext.Provider value={scope}>
      {children}
    </ErrorScopeContext.Provider>
  );
}

export function useErrorScopeContext(): ErrorScope | undefined {
  return useContext(ErrorScopeContext);
}