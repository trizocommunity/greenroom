"use client";

import { createContext, useCallback, useMemo, useState } from "react";

type NavigationAttempt = {
  proceed: () => void;
};

type SaveHandler = () => void | Promise<void>;

type UnsavedChangesContextValue = {
  enabled: boolean;
  isDirty: boolean;
  modalOpen: boolean;
  canSaveFromModal: boolean;
  registerDirtySource: (id: string) => void;
  unregisterDirtySource: (id: string) => void;
  setDirty: (id: string, dirty: boolean) => void;
  clearAllDirty: () => void;
  registerSaveHandler: (id: string, handler: SaveHandler) => void;
  unregisterSaveHandler: (id: string) => void;
  requestNavigation: (attempt: NavigationAttempt) => boolean;
  stayOnPage: () => void;
  discardAndProceed: () => void;
  saveAndProceed: () => Promise<void>;
};

export const UnsavedChangesContext =
  createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const [dirtyBySource, setDirtyBySource] = useState<Record<string, boolean>>({});
  const [saveHandlers, setSaveHandlers] = useState<Record<string, SaveHandler>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<NavigationAttempt | null>(
    null,
  );

  const isDirty = useMemo(
    () => Object.values(dirtyBySource).some(Boolean),
    [dirtyBySource],
  );

  const registerDirtySource = useCallback((id: string) => {
    setDirtyBySource((prev) => (id in prev ? prev : { ...prev, [id]: false }));
  }, []);

  const unregisterDirtySource = useCallback((id: string) => {
    setDirtyBySource((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSaveHandlers((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyBySource((prev) => ({ ...prev, [id]: dirty }));
  }, []);

  const clearAllDirty = useCallback(() => {
    setDirtyBySource((prev) => {
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) next[key] = false;
      return next;
    });
  }, []);

  const registerSaveHandler = useCallback((id: string, handler: SaveHandler) => {
    setSaveHandlers((prev) => ({ ...prev, [id]: handler }));
  }, []);

  const unregisterSaveHandler = useCallback((id: string) => {
    setSaveHandlers((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const requestNavigation = useCallback(
    (attempt: NavigationAttempt) => {
      if (!enabled || !isDirty) {
        attempt.proceed();
        return true;
      }
      setPendingAttempt(attempt);
      setModalOpen(true);
      return false;
    },
    [enabled, isDirty],
  );

  const stayOnPage = useCallback(() => {
    setModalOpen(false);
    setPendingAttempt(null);
  }, []);

  const discardAndProceed = useCallback(() => {
    const attempt = pendingAttempt;
    setModalOpen(false);
    setPendingAttempt(null);
    clearAllDirty();
    if (attempt) attempt.proceed();
  }, [clearAllDirty, pendingAttempt]);

  const saveAndProceed = useCallback(async () => {
    const dirtyIds = Object.entries(dirtyBySource)
      .filter(([, value]) => value)
      .map(([id]) => id);
    const handler = dirtyIds.map((id) => saveHandlers[id]).find(Boolean);
    if (!handler) return;
    await handler();
    const attempt = pendingAttempt;
    setModalOpen(false);
    setPendingAttempt(null);
    if (attempt) attempt.proceed();
  }, [dirtyBySource, pendingAttempt, saveHandlers]);

  const canSaveFromModal = useMemo(() => {
    const dirtyIds = Object.entries(dirtyBySource)
      .filter(([, value]) => value)
      .map(([id]) => id);
    return dirtyIds.some((id) => Boolean(saveHandlers[id]));
  }, [dirtyBySource, saveHandlers]);

  const value = useMemo<UnsavedChangesContextValue>(
    () => ({
      enabled,
      isDirty: enabled && isDirty,
      modalOpen,
      canSaveFromModal,
      registerDirtySource,
      unregisterDirtySource,
      setDirty,
      clearAllDirty,
      registerSaveHandler,
      unregisterSaveHandler,
      requestNavigation,
      stayOnPage,
      discardAndProceed,
      saveAndProceed,
    }),
    [
      enabled,
      isDirty,
      modalOpen,
      canSaveFromModal,
      registerDirtySource,
      unregisterDirtySource,
      setDirty,
      clearAllDirty,
      registerSaveHandler,
      unregisterSaveHandler,
      requestNavigation,
      stayOnPage,
      discardAndProceed,
      saveAndProceed,
    ],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}
