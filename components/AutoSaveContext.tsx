import React, { createContext, useContext, useMemo, useState, useCallback, ReactNode } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveEntry {
  isSaving: boolean;
  error: string | null;
  lastSuccessAt: number | null;
}

interface AutoSaveContextType {
  status: AutoSaveStatus;
  error: string | null;
  beginSave: (id: string) => void;
  finishSave: (id: string) => void;
  failSave: (id: string, error?: string | null) => void;
  clearSave: (id: string) => void;
}

const AutoSaveContext = createContext<AutoSaveContextType | undefined>(undefined);

export const AutoSaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<Record<string, SaveEntry>>({});

  const beginSave = useCallback((id: string) => {
    setEntries(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { error: null, lastSuccessAt: null }),
        isSaving: true,
        error: null,
      },
    }));
  }, []);

  const finishSave = useCallback((id: string) => {
    setEntries(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { error: null, lastSuccessAt: null }),
        isSaving: false,
        error: null,
        lastSuccessAt: Date.now(),
      },
    }));
  }, []);

  const failSave = useCallback((id: string, error: string | null = null) => {
    setEntries(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { lastSuccessAt: null }),
        isSaving: false,
        error: error || 'Erro ao salvar',
      },
    }));
  }, []);

  const clearSave = useCallback((id: string) => {
    setEntries(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const derived = useMemo(() => {
    const all = Object.values(entries);

    const savingCount = all.filter(e => e.isSaving).length;
    if (savingCount > 0) {
      return { status: 'saving' as AutoSaveStatus, error: null };
    }

    const errored = all.find(e => e.error);
    if (errored) {
      return { status: 'error' as AutoSaveStatus, error: errored.error };
    }

    const hasRecentSuccess = all.some(e => e.lastSuccessAt && Date.now() - e.lastSuccessAt < 3000);
    if (hasRecentSuccess) {
      return { status: 'saved' as AutoSaveStatus, error: null };
    }

    return { status: 'idle' as AutoSaveStatus, error: null };
  }, [entries]);

  return (
    <AutoSaveContext.Provider
      value={{
        status: derived.status,
        error: derived.error,
        beginSave,
        finishSave,
        failSave,
        clearSave,
      }}
    >
      {children}
    </AutoSaveContext.Provider>
  );
};

export const useGlobalAutoSave = () => {
  const context = useContext(AutoSaveContext);
  if (!context) {
    return {
      status: 'idle' as AutoSaveStatus,
      error: null,
      beginSave: () => { },
      finishSave: () => { },
      failSave: () => { },
      clearSave: () => { },
    };
  }
  return context;
};