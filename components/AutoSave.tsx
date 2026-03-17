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
  successDuration = 3000,
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
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all animate-in fade-in duration-300">
      {status === 'saving' && (
        <div className="flex items-center gap-1.5 text-blue-500">
          <RefreshCw size={12} className="animate-spin" />
          <span>Sincronizando...</span>
        </div>
      )}

      {status === 'saved' && (
        <div className="flex items-center gap-1.5 text-emerald-500">
          <Check size={12} />
          <span>Alterações salvas</span>
        </div>
      )}

      {status === 'error' && (
        <div
          className="flex items-center gap-1.5 text-rose-500"
          title={error || ''}
        >
          <AlertCircle size={12} />
          <span>Erro ao salvar</span>
        </div>
      )}
    </div>
  );
};