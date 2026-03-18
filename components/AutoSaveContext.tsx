import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveEntry {
  isSaving: boolean;
  error: string | null;
  lastSuccessAt: number | null;
  startedAt: number | null;
  version: number;
}

interface AutoSaveContextType {
  status: AutoSaveStatus;
  error: string | null;
  beginSave: (id: string) => number;
  finishSave: (id: string, version?: number) => void;
  failSave: (id: string, error?: string | null, version?: number) => void;
  clearSave: (id: string) => void;
}

const AutoSaveContext = createContext<AutoSaveContextType | undefined>(undefined);

export const AutoSaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<Record<string, SaveEntry>>({});
  const entriesRef = useRef<Record<string, SaveEntry>>({});

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const beginSave = useCallback((id: string) => {
    const version = Date.now() + Math.floor(Math.random() * 1000);

    setEntries((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          error: null,
          lastSuccessAt: null,
          startedAt: null,
          version,
          isSaving: false,
        }),
        isSaving: true,
        error: null,
        startedAt: Date.now(),
        version,
      },
    }));

    return version;
  }, []);

  const finishSave = useCallback((id: string, version?: number) => {
    setEntries((prev) => {
      const current = prev[id];
      if (!current) return prev;

      if (version !== undefined && current.version !== version) {
        return prev;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          isSaving: false,
          error: null,
          lastSuccessAt: Date.now(),
          startedAt: null,
        },
      };
    });
  }, []);

  const failSave = useCallback((id: string, error: string | null = null, version?: number) => {
    setEntries((prev) => {
      const current = prev[id];
      if (!current) return prev;

      if (version !== undefined && current.version !== version) {
        return prev;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          isSaving: false,
          error: error || 'Erro ao salvar',
          startedAt: null,
        },
      };
    });
  }, []);

  const clearSave = useCallback((id: string) => {
    setEntries((prev) => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const derived = useMemo(() => {
    const all = Object.entries(entries).map(([id, entry]) => ({
      id,
      ...entry,
    }));

    const savingItems = all.filter((e) => e.isSaving);
    const savingCount = savingItems.length;

    if (savingCount > 0) {
      console.log(
        `[AutoSaveContext] Ativo: ${savingCount} item(ns) salvando...`,
        savingItems.map((e) => e.id)
      );
      return { status: 'saving' as AutoSaveStatus, error: null };
    }

    const errored = all.find((e) => e.error);
    if (errored) {
      return { status: 'error' as AutoSaveStatus, error: errored.error };
    }

    const now = Date.now();
    const hasRecentSuccess = all.some(
      (e) => e.lastSuccessAt !== null && now - e.lastSuccessAt < 3000
    );

    if (hasRecentSuccess) {
      return { status: 'saved' as AutoSaveStatus, error: null };
    }

    return { status: 'idle' as AutoSaveStatus, error: null };
  }, [entries]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentEntries = entriesRef.current;
      let changed = false;

      const nextEntries: Record<string, SaveEntry> = { ...currentEntries };

      (Object.entries(currentEntries) as [string, SaveEntry][]).forEach(([id, entry]) => {
        if (entry.isSaving && entry.startedAt && now - entry.startedAt > 60000) {
          console.warn(`[AutoSaveContext] Forçando limpeza de save travado (60s+): ${id}`);

          nextEntries[id] = {
            ...entry,
            isSaving: false,
            error: 'Timeout de rede excedido',
            startedAt: null,
          };

          changed = true;
        }
      });

      if (changed) {
        setEntries(nextEntries);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

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
      beginSave: () => 0,
      finishSave: () => { },
      failSave: () => { },
      clearSave: () => { },
    };
  }

  return context;
};