"use client";

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { errorStore } from "@/core/errors/error-store";

export interface InlineErrorMutationMeta {
  requireInlineError?: true;
  errorScope?: string;
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: InlineErrorMutationMeta;
  }
}

export type InlineErrorMutationOptions<TData, TError, TVariables, TContext> =
  UseMutationOptions<TData, TError, TVariables, TContext> & {
    meta?: InlineErrorMutationMeta;
  };

export function useInlineErrorMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: InlineErrorMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const scope = options.meta?.errorScope;
  const userOnError = options.onError;

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onError: (err, vars, ctx, mutation) => {
      userOnError?.(err, vars, ctx, mutation);
      errorStore.push({ err, scope });
    },
  });
}