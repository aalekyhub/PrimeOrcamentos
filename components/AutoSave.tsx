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
  const saveVersion = useRef(0);

  useEffect(() => {
    return () => {
      isMounted.current = false;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (resetStatusTimer.current) {
        clearTimeout(resetStatusTimer.current);
      }

      clearSave(id);
    };
  }, [id, clearSave]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (resetStatusTimer.current) {
      clearTimeout(resetStatusTimer.current);
    }

    setStatus('idle');
    setError(null);

    const currentVersion = ++saveVersion.current;

    debounceTimer.current = setTimeout(async () => {
      if (!isMounted.current) return;

      setStatus('saving');
      setError(null);
      beginSave(id);

      try {
        await onSave(data);

        if (!isMounted.current || currentVersion !== saveVersion.current) return;

        setStatus('saved');
        finishSave(id);

        resetStatusTimer.current = setTimeout(() => {
          if (!isMounted.current || currentVersion !== saveVersion.current) return;

          setStatus('idle');
          clearSave(id);
        }, successDuration);
      } catch (err: any) {
        if (!isMounted.current || currentVersion !== saveVersion.current) return;

        const message = err?.message || 'Erro ao sincronizar';

        console.error('AutoSave Error:', err);
        setStatus('error');
        setError(message);
        failSave(id, message);
      }
    }, delay);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [id, data, onSave, delay, successDuration, beginSave, finishSave, failSave, clearSave]);

  if (status === 'idle') return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-500 animate-in fade-in zoom-in-95 ${status === 'saving' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' :
        status === 'saved' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' :
          'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
      }`}>
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
        <div
          className="flex items-center gap-1.5"
          title={error || ''}
        >
          <AlertCircle size={12} />
          <span>Erro ao salvar</span>
        </div>
      )}
    </div>
  );
};