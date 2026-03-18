import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useGlobalAutoSave } from './AutoSaveContext';

type LocalAutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveProps<T> {
  id: string;
  data: T;
  onSave: (data: T) => Promise<any>;
  delay?: number;
  successDuration?: number;
}

export const AutoSave = <T,>({
  id,
  data,
  onSave,
  delay = 2000,
  successDuration = 5000,
}: AutoSaveProps<T>) => {
  const [status, setStatus] = useState<LocalAutoSaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const { beginSave, finishSave, failSave, clearSave } = useGlobalAutoSave();

  const firstRender = useRef(true);
  const isMounted = useRef(true);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSavedData = useRef<string>(JSON.stringify(data));
  const saveVersion = useRef(0);
  const activeSavingVersion = useRef<number | null>(null);

  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    return () => {
      isMounted.current = false;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      if (resetStatusTimer.current) {
        clearTimeout(resetStatusTimer.current);
        resetStatusTimer.current = null;
      }

      activeSavingVersion.current = null;
      clearSave(id);
    };
  }, [id, clearSave]);

  useEffect(() => {
    const dataString = JSON.stringify(data);

    if (firstRender.current) {
      firstRender.current = false;
      lastSavedData.current = dataString;
      return;
    }

    if (dataString === lastSavedData.current) {
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    if (resetStatusTimer.current) {
      clearTimeout(resetStatusTimer.current);
      resetStatusTimer.current = null;
    }

    setStatus('idle');
    setError(null);

    const currentVersion = ++saveVersion.current;

    debounceTimer.current = setTimeout(() => {
      if (!isMounted.current) return;

      activeSavingVersion.current = currentVersion;
      setStatus('saving');
      setError(null);
      beginSave(id);

      const runSave = async () => {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout na sincronização (30s)')), 30000)
        );

        try {
          await Promise.race([onSaveRef.current(data), timeoutPromise]);

          if (!isMounted.current) {
            clearSave(id);
            return;
          }

          // Se esta não é mais a versão ativa, apenas libera o estado global.
          if (
            currentVersion !== saveVersion.current ||
            activeSavingVersion.current !== currentVersion
          ) {
            clearSave(id);
            return;
          }

          lastSavedData.current = dataString;
          activeSavingVersion.current = null;

          setStatus('saved');
          setError(null);
          finishSave(id);

          resetStatusTimer.current = setTimeout(() => {
            if (!isMounted.current) {
              clearSave(id);
              return;
            }

            // Só limpa se essa ainda for a última versão concluída
            if (currentVersion !== saveVersion.current) return;

            setStatus('idle');
            clearSave(id);
          }, successDuration);
        } catch (err: any) {
          const message = err?.message || 'Erro ao sincronizar';

          if (!isMounted.current) {
            clearSave(id);
            return;
          }

          // Mesmo que seja versão antiga, não pode deixar o global preso
          if (
            currentVersion !== saveVersion.current ||
            activeSavingVersion.current !== currentVersion
          ) {
            clearSave(id);
            return;
          }

          activeSavingVersion.current = null;

          console.error(`AutoSave Error [${id}]:`, err);
          setStatus('error');
          setError(message);
          failSave(id, message);
        }
      };

      void runSave();
    }, delay);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [id, data, delay, successDuration, beginSave, finishSave, failSave, clearSave]);

  if (status === 'idle') return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-500 animate-in fade-in zoom-in-95 ${status === 'saving'
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
          : status === 'saved'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
        }`}
    >
      {status === 'saving' && (
        <>
          <RefreshCw size={12} className="animate-spin" />
          <span className="animate-pulse">Sincronizando...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <Check size={12} className="shrink-0" />
          <span>Alterações salvas</span>
        </>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-1.5" title={error || ''}>
          <AlertCircle size={12} />
          <span>Erro ao salvar</span>
        </div>
      )}
    </div>
  );
};