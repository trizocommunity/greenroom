import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface OptimisticContext {
  prev: unknown;
  tempId?: string;
}

export interface CreateMutationConfig<TItem, TVariables> {
  getQueryKey: (variables: TVariables) => QueryKey;
  mutationFn: (variables: TVariables) => Promise<TItem>;
  createOptimisticItem: (variables: TVariables, tempId: string) => TItem;
  updateOptimisticItem?: (item: TItem, variables: TVariables) => TItem;
  isTempId?: (id: string) => boolean;
}

export function createCreateMutation<TItem extends { id: string }, TVariables>({
  getQueryKey,
  mutationFn,
  createOptimisticItem,
  updateOptimisticItem,
  isTempId = (id: string) => id.startsWith("temp-"),
}: CreateMutationConfig<TItem, TVariables>) {
  return function useCreate() {
    const qc = useQueryClient();

    return useMutation<TItem, Error, TVariables, OptimisticContext>({
      mutationFn,
      onMutate: async (variables) => {
        const queryKey = getQueryKey(variables);
        await qc.cancelQueries({ queryKey });
        const prev = qc.getQueryData<TItem[]>(queryKey);
        const tempId = `temp-${Date.now()}`;
        const optimisticItem = createOptimisticItem(variables, tempId);

        qc.setQueryData<TItem[]>(queryKey, (old) =>
          old ? [...old, optimisticItem] : [optimisticItem],
        );

        return { prev, tempId };
      },
      onError: (_err, variables, context) => {
        const queryKey = getQueryKey(variables);
        if (context?.prev) {
          qc.setQueryData(queryKey, context.prev as TItem[]);
        }
      },
      onSuccess: (data, variables) => {
        const queryKey = getQueryKey(variables);
        qc.setQueryData<TItem[]>(queryKey, (old) =>
          old?.map((item) =>
            isTempId(item.id)
              ? data
              : updateOptimisticItem
                ? updateOptimisticItem(item, variables)
                : item,
          ),
        );
      },
    });
  };
}

export interface UpdateMutationConfig<TItem, TVariables> {
  getQueryKey: (variables: TVariables) => QueryKey;
  mutationFn: (variables: TVariables) => Promise<TItem>;
  updateOptimisticItem: (item: TItem, variables: TVariables) => TItem;
  getItemId: (item: TItem) => string;
}

export function createUpdateMutation<TItem, TVariables>({
  getQueryKey,
  mutationFn,
  updateOptimisticItem,
  getItemId,
}: UpdateMutationConfig<TItem, TVariables>) {
  return function useUpdate() {
    const qc = useQueryClient();

    return useMutation<TItem, Error, TVariables, OptimisticContext>({
      mutationFn,
      onMutate: async (variables) => {
        const queryKey = getQueryKey(variables);
        await qc.cancelQueries({ queryKey });
        const prev = qc.getQueryData<TItem[]>(queryKey);

        qc.setQueryData<TItem[]>(queryKey, (old) =>
          old?.map((item) => updateOptimisticItem(item, variables)),
        );

        return { prev };
      },
      onError: (_err, variables, context) => {
        const queryKey = getQueryKey(variables);
        if (context?.prev) {
          qc.setQueryData(queryKey, context.prev as TItem[]);
        }
      },
      onSuccess: (data, variables) => {
        const queryKey = getQueryKey(variables);
        qc.setQueryData<TItem[]>(queryKey, (old) =>
          old?.map((item) =>
            getItemId(item) === getItemId(data) ? data : item,
          ),
        );
      },
    });
  };
}

export interface DeleteMutationConfig<TItem, TVariables> {
  getQueryKey: (variables: TVariables) => QueryKey;
  mutationFn: (variables: TVariables) => Promise<void>;
  getItemId: (variables: TVariables) => string;
}

export function createDeleteMutation<TItem, TVariables>({
  getQueryKey,
  mutationFn,
  getItemId,
}: DeleteMutationConfig<TItem, TVariables>) {
  return function useDelete() {
    const qc = useQueryClient();

    return useMutation<void, Error, TVariables, OptimisticContext>({
      mutationFn,
      onMutate: async (variables) => {
        const queryKey = getQueryKey(variables);
        await qc.cancelQueries({ queryKey });
        const prev = qc.getQueryData<TItem[]>(queryKey);
        const itemId = getItemId(variables);

        qc.setQueryData<TItem[]>(queryKey, (old) =>
          old?.filter((item: any) => item.id !== itemId),
        );

        return { prev };
      },
      onError: (_err, variables, context) => {
        const queryKey = getQueryKey(variables);
        if (context?.prev) {
          qc.setQueryData(queryKey, context.prev as TItem[]);
        }
      },
    });
  };
}
